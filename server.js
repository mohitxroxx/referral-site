const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const connectDB = require('./config/db')
const auth = require("./routes/admin")
dotenv.config({ path: './config/.env' })
connectDB()

const app = express()
app.use(cors());
app.use(express.json());


app.use("/api", auth)

const PORT = app.listen(process.env.PORT, () =>
  console.log(`SERVER UP and running at ${process.env.PORT}`)
)

app.get("/", (req, res) => {
  res.status(200).send("Server up and running")
})
