// server.js - Main Express Server
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
    secret: 'hrms-secret-key-2024',
    store: new FileStore({ path: './sessions' }),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// File storage setup
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = 'uploads/profiles';
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Data file paths
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const LEAVES_FILE = path.join(DATA_DIR, 'leaves.json');

// Initialize data directory and files
async function initializeData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir('uploads/profiles', { recursive: true });
        await fs.mkdir('sessions', { recursive: true });
        
        // Initialize users file with admin account
        try {
            await fs.access(USERS_FILE);
        } catch {
            const adminPassword = await bcrypt.hash('admin123', 10);
            const initialUsers = [{
                id: 'EMP001',
                email: 'admin@dayflow.com',
                password: adminPassword,
                role: 'admin',
                name: 'Admin User',
                phone: '1234567890',
                address: '123 Admin St',
                department: 'Management',
                position: 'Administrator',
                salary: 100000,
                joinDate: '2024-01-01',
                profilePicture: null,
                status: 'present'
            }];
            await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2));
        }
        
        // Initialize attendance file
        try {
            await fs.access(ATTENDANCE_FILE);
        } catch {
            await fs.writeFile(ATTENDANCE_FILE, JSON.stringify([], null, 2));
        }
        
        // Initialize leaves file
        try {
            await fs.access(LEAVES_FILE);
        } catch {
            await fs.writeFile(LEAVES_FILE, JSON.stringify([], null, 2));
        }
    } catch (err) {
        console.error('Error initializing data:', err);
    }
}

// Helper functions to read/write data
async function readData(file) {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writeData(file, data) {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Access denied');
    }
}

// Routes

// Home - redirect to login or dashboard
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Sign Up page
app.get('/signup', (req, res) => {
    res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
    try {
        const { employeeId, email, password, name, role } = req.body;
        const users = await readData(USERS_FILE);
        
        // Check if user exists
        if (users.find(u => u.email === email || u.id === employeeId)) {
            return res.render('signup', { error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = {
            id: employeeId,
            email,
            password: hashedPassword,
            role: role || 'employee',
            name,
            phone: '',
            address: '',
            department: '',
            position: '',
            salary: 0,
            joinDate: new Date().toISOString().split('T')[0],
            profilePicture: null,
            status: 'absent'
        };
        
        users.push(newUser);
        await writeData(USERS_FILE, users);
        
        res.redirect('/login');
    } catch (err) {
        res.render('signup', { error: 'Error creating account' });
    }
});

// Login page
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = await readData(USERS_FILE);
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.render('login', { error: 'Invalid credentials' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.render('login', { error: 'Invalid credentials' });
        }
        
        req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        
        res.redirect('/dashboard');
    } catch (err) {
        res.render('login', { error: 'Error logging in' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
    const users = await readData(USERS_FILE);
    const user = users.find(u => u.id === req.session.user.id);
    
    if (req.session.user.role === 'admin') {
        const leaves = await readData(LEAVES_FILE);
        const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
        
        res.render('admin-dashboard', { 
            user: req.session.user, 
            employees: users.filter(u => u.role === 'employee'),
            pendingLeaves
        });
    } else {
        const attendance = await readData(ATTENDANCE_FILE);
        const leaves = await readData(LEAVES_FILE);
        const userAttendance = attendance.filter(a => a.employeeId === req.session.user.id);
        const userLeaves = leaves.filter(l => l.employeeId === req.session.user.id);
        
        res.render('employee-dashboard', { 
            user: req.session.user,
            profile: user,
            recentAttendance: userAttendance.slice(-5),
            recentLeaves: userLeaves.slice(-5)
        });
    }
});

// Profile
app.get('/profile', isAuthenticated, async (req, res) => {
    const users = await readData(USERS_FILE);
    const user = users.find(u => u.id === req.session.user.id);
    res.render('profile', { user: req.session.user, profile: user });
});

app.post('/profile/update', isAuthenticated, upload.single('profilePicture'), async (req, res) => {
    try {
        const users = await readData(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === req.session.user.id);
        
        if (userIndex !== -1) {
            const { name, phone, address } = req.body;
            users[userIndex].name = name || users[userIndex].name;
            users[userIndex].phone = phone || users[userIndex].phone;
            users[userIndex].address = address || users[userIndex].address;
            
            if (req.file) {
                users[userIndex].profilePicture = '/uploads/profiles/' + req.file.filename;
            }
            
            await writeData(USERS_FILE, users);
            req.session.user.name = users[userIndex].name;
        }
        
        res.redirect('/profile');
    } catch (err) {
        res.status(500).send('Error updating profile');
    }
});

// Attendance
app.get('/attendance', isAuthenticated, async (req, res) => {
    const attendance = await readData(ATTENDANCE_FILE);
    let records;
    
    if (req.session.user.role === 'admin') {
        records = attendance;
    } else {
        records = attendance.filter(a => a.employeeId === req.session.user.id);
    }
    
    res.render('attendance', { 
        user: req.session.user, 
        records,
        isAdmin: req.session.user.role === 'admin'
    });
});

app.post('/attendance/checkin', isAuthenticated, async (req, res) => {
    try {
        const attendance = await readData(ATTENDANCE_FILE);
        const users = await readData(USERS_FILE);
        const today = new Date().toISOString().split('T')[0];
        
        // Check if already checked in today
        const existingRecord = attendance.find(
            a => a.employeeId === req.session.user.id && a.date === today
        );
        
        if (existingRecord) {
            return res.json({ error: 'Already checked in today' });
        }
        
        const newRecord = {
            id: Date.now().toString(),
            employeeId: req.session.user.id,
            employeeName: req.session.user.name,
            date: today,
            checkIn: new Date().toLocaleTimeString(),
            checkOut: null,
            status: 'present'
        };
        
        attendance.push(newRecord);
        await writeData(ATTENDANCE_FILE, attendance);
        
        // Update user status
        const userIndex = users.findIndex(u => u.id === req.session.user.id);
        if (userIndex !== -1) {
            users[userIndex].status = 'present';
            await writeData(USERS_FILE, users);
        }
        
        res.json({ success: true, record: newRecord });
    } catch (err) {
        res.json({ error: 'Error checking in' });
    }
});

app.post('/attendance/checkout', isAuthenticated, async (req, res) => {
    try {
        const attendance = await readData(ATTENDANCE_FILE);
        const users = await readData(USERS_FILE);
        const today = new Date().toISOString().split('T')[0];
        
        const recordIndex = attendance.findIndex(
            a => a.employeeId === req.session.user.id && a.date === today
        );
        
        if (recordIndex === -1) {
            return res.json({ error: 'No check-in record found' });
        }
        
        if (attendance[recordIndex].checkOut) {
            return res.json({ error: 'Already checked out' });
        }
        
        attendance[recordIndex].checkOut = new Date().toLocaleTimeString();
        await writeData(ATTENDANCE_FILE, attendance);
        
        // Update user status
        const userIndex = users.findIndex(u => u.id === req.session.user.id);
        if (userIndex !== -1) {
            users[userIndex].status = 'absent';
            await writeData(USERS_FILE, users);
        }
        
        res.json({ success: true, record: attendance[recordIndex] });
    } catch (err) {
        res.json({ error: 'Error checking out' });
    }
});

// Leaves
app.get('/leaves', isAuthenticated, async (req, res) => {
    const leaves = await readData(LEAVES_FILE);
    let records;
    
    if (req.session.user.role === 'admin') {
        records = leaves;
    } else {
        records = leaves.filter(l => l.employeeId === req.session.user.id);
    }
    
    res.render('leaves', { 
        user: req.session.user, 
        records,
        isAdmin: req.session.user.role === 'admin'
    });
});

app.post('/leaves/apply', isAuthenticated, async (req, res) => {
    try {
        const { leaveType, startDate, endDate, remarks } = req.body;
        const leaves = await readData(LEAVES_FILE);
        
        const newLeave = {
            id: Date.now().toString(),
            employeeId: req.session.user.id,
            employeeName: req.session.user.name,
            leaveType,
            startDate,
            endDate,
            remarks,
            status: 'pending',
            appliedDate: new Date().toISOString().split('T')[0]
        };
        
        leaves.push(newLeave);
        await writeData(LEAVES_FILE, leaves);
        
        res.redirect('/leaves');
    } catch (err) {
        res.status(500).send('Error applying for leave');
    }
});

app.post('/leaves/approve/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const leaves = await readData(LEAVES_FILE);
        const leaveIndex = leaves.findIndex(l => l.id === req.params.id);
        
        if (leaveIndex !== -1) {
            leaves[leaveIndex].status = 'approved';
            await writeData(LEAVES_FILE, leaves);
        }
        
        res.redirect('/leaves');
    } catch (err) {
        res.status(500).send('Error approving leave');
    }
});

app.post('/leaves/reject/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const leaves = await readData(LEAVES_FILE);
        const leaveIndex = leaves.findIndex(l => l.id === req.params.id);
        
        if (leaveIndex !== -1) {
            leaves[leaveIndex].status = 'rejected';
            await writeData(LEAVES_FILE, leaves);
        }
        
        res.redirect('/leaves');
    } catch (err) {
        res.status(500).send('Error rejecting leave');
    }
});

// Admin - Employee Management
app.get('/employees', isAuthenticated, isAdmin, async (req, res) => {
    const users = await readData(USERS_FILE);
    res.render('employees', { user: req.session.user, employees: users });
});

app.post('/employees/add', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { employeeId, email, password, name, phone, department, position, salary } = req.body;
        const users = await readData(USERS_FILE);
        
        // Check if user exists
        if (users.find(u => u.email === email || u.id === employeeId)) {
            return res.redirect('/employees?error=User already exists');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = {
            id: employeeId,
            email,
            password: hashedPassword,
            role: 'employee',
            name,
            phone: phone || '',
            address: '',
            department: department || '',
            position: position || '',
            salary: parseFloat(salary) || 0,
            joinDate: new Date().toISOString().split('T')[0],
            profilePicture: null,
            status: 'absent'
        };
        
        users.push(newUser);
        await writeData(USERS_FILE, users);
        
        res.redirect('/employees');
    } catch (err) {
        res.redirect('/employees?error=Error creating employee');
    }
});

app.get('/employees/:id', isAuthenticated, isAdmin, async (req, res) => {
    const users = await readData(USERS_FILE);
    const employee = users.find(u => u.id === req.params.id);
    
    if (!employee) {
        return res.status(404).send('Employee not found');
    }
    
    const attendance = await readData(ATTENDANCE_FILE);
    const leaves = await readData(LEAVES_FILE);
    const employeeAttendance = attendance.filter(a => a.employeeId === req.params.id);
    const employeeLeaves = leaves.filter(l => l.employeeId === req.params.id);
    
    res.render('employee-detail', {
        user: req.session.user,
        employee,
        attendance: employeeAttendance,
        leaves: employeeLeaves
    });
});

app.post('/employees/:id/update', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await readData(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === req.params.id);
        
        if (userIndex !== -1) {
            const { name, email, phone, address, department, position, salary } = req.body;
            users[userIndex] = {
                ...users[userIndex],
                name,
                email,
                phone,
                address,
                department,
                position,
                salary: parseFloat(salary)
            };
            
            await writeData(USERS_FILE, users);
        }
        
        res.redirect('/employees/' + req.params.id);
    } catch (err) {
        res.status(500).send('Error updating employee');
    }
});

// Initialize and start server
initializeData().then(() => {
    app.listen(PORT, () => {
        console.log(`HRMS Server running on http://localhost:${PORT}`);
        console.log('Default admin login:');
        console.log('Email: admin@dayflow.com');
        console.log('Password: admin123');
    });
});