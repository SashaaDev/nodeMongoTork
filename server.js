require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer')
const app = express();
const path = require('path');
const fs = require('fs');

app.use(bodyParser.json());
app.use(cors());

const {MONGODB_URI, JWT_SECRET} = process.env;
console.log(MONGODB_URI, JWT_SECRET);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  documents: {
    nidFront: {type: String},
    nidBack: {type: String},
    selfieWithNid: {type: String},
  }
});

const User = mongoose.model('User', userSchema);

const 3uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {fileSize: 10 * 1024 * 1024},
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb('Error: File upload only supports the following filetypes - ' + filetypes);
  }
});
app.post('/register', async (req, res) => {
  try {
    const {firstName, lastName, email, password, confirmPassword} = req.body;
    console.log('Register attempt:', email);

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).send('All fields are required');
    }

    if (password !== confirmPassword) {
      return res.status(400).send('Passwords do not match');
    }

    const existingUser = await User.findOne({email});
    if (existingUser) {
      return res.status(400).send('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).send('User registered');
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/login', async (req, res) => {
  try {
    const {email, password} = req.body;
    console.log('Login attempt:', email);

    if (!email || !password) {
      console.log('Email or password missing');
      return res.status(400).send('Email and password are required');
    }

    const user = await User.findOne({email});
    if (!user) {
      console.log('User not found'); // Debug line
      return res.status(400).send('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(400).send('Invalid credentials');
    }

    const token = jwt.sign({id: user._id}, JWT_SECRET, {expiresIn: '1h'});
    console.log('Login successful');

    res.json({token});
  } catch (err) {
    console.error('Server error', err);
    res.status(500).send('Server error');
  }
});

const auth = (req, res, next) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).send('No token, authorization denied');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).send('Token is not valid');
  }
};

app.post('/upload', auth, upload.fields([
  { name: 'nid-front', maxCount: 1 },
  { name: 'nid-back', maxCount: 1 },
  { name: 'selfie-with-nid', maxCount: 1 }
]), async (req, res) => {
  try {
    const { files } = req;
    if (!files['nid-front'] || !files['nid-back'] || !files['selfie-with-nid']) {
      return res.status(400).send('All three files are required');
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    if (user.documents.nidFront) {
      fs.unlink(path.join(__dirname, user.documents.nidFront), (err) => {
        if (err) console.error('Failed to delete old nidFront:', err);
      });
    }
    if (user.documents.nidBack) {
      fs.unlink(path.join(__dirname, user.documents.nidBack), (err) => {
        if (err) console.error('Failed to delete old nidBack:', err);
      });
    }
    if (user.documents.selfieWithNid) {
      fs.unlink(path.join(__dirname, user.documents.selfieWithNid), (err) => {
        if (err) console.error('Failed to delete old selfieWithNid:', err);
      });
    }

    user.documents = {
      nidFront: files['nid-front'][0].path,
      nidBack: files['nid-back'][0].path,
      selfieWithNid: files['selfie-with-nid'][0].path
    };

    await user.save();
    res.status(200).send('Documents uploaded successfully');
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send('Server error');
  }
});

app.get('/protected', auth, (req, res) => {
  res.send('This is a protected route');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
