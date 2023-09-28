const express = require('express');
const app = express();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const bcrypt = require('bcrypt');

const serviceAccount = require('./key.json');
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

app.use(express.static(__dirname));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/signup', function (req, res) {
  res.sendFile(path.join(__dirname, 'signuppage.html'));
});

app.post('/signupsubmit', async function (req, res) {
  const { fullname, email, password } = req.body;

  const emailExists = await checkEmailExists(email);

  if (emailExists) {
    res.send('Email already exists. Please use a different email address.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.collection('studentsinfo').add({
    Fullname: fullname,
    Email: email,
    password: hashedPassword,
  });

  res.redirect('/login');
});

app.get('/login', function (req, res) {
  res.sendFile(path.join(__dirname, 'loginpage.html'));
});

app.post('/loginsubmit', function (req, res) {
  const { email, password } = req.body;

  db.collection('studentsinfo')
    .where('Email', '==', email)
    .get()
    .then(async (docs) => {
      if (docs.size === 1) {
        const user = docs.docs[0].data();
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
          res.redirect('/movie');
        } else {
          res.send('Please enter valid credentials');
        }
      } else {
        res.send('Please enter valid credentials');
      }
    });
});

app.get('/movie', function (req, res) {
  res.render('app');
});

app.post('/search', async (req, res) => {
  const searchTerm = req.body.searchTerm;

  try {
    const response = await axios.get(
      `https://omdbapi.com/?s=${searchTerm}&page=1&apikey=57bd221e`
    );
    const movieData = response.data;

    if (movieData.Response === 'True') {
      const movies = movieData.Search;
      res.render('searchResults', { movies });
    } else {
      res.send('No movies found.');
    }
  } catch (error) {
    res.send('Sorry, an error occurred.');
  }
});

async function checkEmailExists(email) {
  const emailQuery = db.collection('studentsinfo').where('Email', '==', email);
  const emailDocs = await emailQuery.get();
  return !emailDocs.empty;
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`running on port ${port}`);
});
