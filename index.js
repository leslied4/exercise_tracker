const express = require('express')
const app = express()
const cors = require('cors')
var bodyParser = require("body-parser");
const mongoose = require('mongoose');


require('dotenv').config()

// MongoDB URI
const uri = `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@pms.caysyu8.mongodb.net/?retryWrites=true&w=majority&appName=pms`;

// Connect to MongoDB using Mongoose
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB via Mongoose"))
  .catch(err => console.error("Connection error:", err));

app.use(cors())
app.use(express.static('public'))
// Middleware for parsing POST request bodies
app.use(bodyParser.urlencoded({ extended: false }));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = { User, Exercise };

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;

  try {
    const newUser = await User.create({ username });
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Unable to create user' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { __v: 0 }); // Exclude version key
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Unable to fetch users' });
  }
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = await Exercise.create({
      userId: _id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Unable to add exercise' });
  }
});


app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let filter = { userId: _id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let exercises = await Exercise.find(filter)
      .limit(parseInt(limit))
      .select('-userId -__v');

    const log = exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: 'Unable to fetch logs' });
  }
});




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
