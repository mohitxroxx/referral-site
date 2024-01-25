const dotenv = require('dotenv')
const jwt = require("jsonwebtoken")
const auth = require("../middleware/auth")
const User = require("../models/user")
const express = require("express")
const session = require("express-session")
const cookieParser = require('cookie-parser')
const bcrypt = require("bcrypt")
const nodemailer = require('nodemailer')
const fs = require('fs').promises
const multer = require('multer')
const FormData = require('form-data')
const axios = require('axios')
const upload = multer()

// let permanent

const app = express()

app.use(express.json())
app.use(cookieParser())
dotenv.config()

app.use(
    session({
       secret: process.env.SESSION_SECRET,
       resave: false,
       saveUninitialized: false,
       cookie: {},
    })
  )

const { SMTP_EMAIL, SMTP_PASS } = process.env

let transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_PASS,
  },
})

app.post("/login", async (req, res) => {
    try {
        const { username, password,rememberMe } = req.body
        const user = await User.findOne({ username })
        if (!user)
            return res.json({ msg: "Incorrect Username or Password", status: false })
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid)
            return res.json({ msg: "Incorrect Username or Password", status: false })
        delete user.password
        const expiresIn = rememberMe ? '7d' : '2h';
        const token = jwt.sign({ id: user.id, username: user.username },  process.env.TOKEN_KEY, { expiresIn })
        res.cookie('jwt', token, {
            secure: true,
            maxAge: expiresIn === '7d' ? 7 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000,
            httpOnly: true
        })
        return res.json({msg: 'Login successful',status: true})
    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: 'Server error', status: false })
    }
})


app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body
        const usernameCheck = await User.findOne({ username })
        if (usernameCheck)
            return res.status(404).json({ error: 'Username already used' })
        const emailCheck = await User.findOne({ email })
        if (emailCheck)
            return res.status(404).json({ error: 'Email already used' })
        // const otpreq={...req,body:{email}}
        // await otp(otpreq,res)
        // return res.status(200).json({ msg: 'Check Mail for further process' })
        const otp = Math.floor(1000 + Math.random() * 9000)
        console.log(otp)
        req.session.otp=otp
        // permanent = otp
        const mailOptions = {
            from: SMTP_EMAIL,
            to: email,
            subject: "Welcome To Health Bot",
            html: `<body>
            <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f7f7f7;">
            <table role="presentation" cellspacing="0" cellpadding="0"  width="600"
            style="margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 5px; box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.3);">p
            <tr>
            <td>
            <h3 style="color: #0838bc; font-size: 24px; text-align: center; margin-bottom: 10px;">Verification Mail</h3>
            <hr style="border: 1px solid #ccc; margin: 20px 0;">
            <h4 style="font-size: 20px; color: #333;">Hi there,</h4>
            <p style="font-size: 16px; color: #333; margin: 20px 0;">Here is the otp to confirm your mail ${otp}</p>
            <p style="font-size: 16px; color: #333;">We are happy to have you.</p>
                        <div style="font-size: 16px; color: #333; margin-top: 20px; text-align: center;">
                        <h5 style="font-size: 18px;">Best Regards</h5>
                        <h5 style="font-size: 18px;">Health Bot</h5>
                        </div>
                    </td>
                    </tr>
                    </table>
                    </body>
                </body>`,
        }
        transporter
            .sendMail(mailOptions)
            .then(() => {
                console.log("Mail sent to the user")
                return res.status(200).json({ msg: 'Mail sent to the user' })
            })
            .catch((err) => {
                console.log(err);
            })
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: 'Error registering the user' })
    }
})





app.post("/verify", async (req, res) => {
    const { username, email, password,otp } = req.body

    if (req.session.otp == otp) {
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({
            email,
            username,
            password: hashedPassword,
        })
        delete user.password
        return res.status(200).json({ message: "Registered Successfully", user: user });
    } else {
        return res.status(400).json({msg:"Invalid OTP cant register"})
    }
})


app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const image = req.file;

        const formData = new FormData();

        formData.append('file', image.buffer, {
            filename: image.originalname,
            contentType: image.mimetype,
        });
        
        const response = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: {
                ...formData.getHeaders(),
                'apikey':process.env.key
            },
        })
        
        const text = response.data.ParsedResults[0].ParsedText;
        res.json({ text });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while processing the image' });
    }
})


app.get("/home", auth, (req, res) => {
    return res.status(200).json({ msg: 'User Logged in and Session is Active' })
})

app.get("/logout",async(req, res) => {
    try {
        res.clearCookie('jwt')
        return res.status(200).json({ msg: 'User Logged out and session ended' })
    } catch (ex) {
        return res.status(400).json({ msg: 'Failed request' })
    }
})








module.exports = app;