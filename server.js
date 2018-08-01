// setup environment variables, looks for .env file and loads the env variables
require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const mongoose = require('mongoose')

// connect config and models files
const {PORT, DATABASE_URL} = require('./config')
const {Post} = require('./models')

// use express for app
const app = express()

// setup morgan common and body parser
app.use(morgan('common'))
app.use(bodyParser.json())

// make mongoose use built in es6 promises
mongoose.Promise = global.Promise

// GET requests to /posts
// Return all posts apiRepr json
app.get('/posts', (req, res) => {
  Post
    .find()
    // for each post return the apiRepr json
    .then(posts => {
      res.json(posts.map(post => post.apiRepr()))
    })
    // error handling
    .catch(
      err => {
        console.error(err)
        res.status(500).json({message: 'Internal server error'})
      })
})

// GET requests to /posts/:id
// Return the post apiRepr json
app.get('/posts/:id', (req, res) => {
  Post
    .findById(req.params.id)
    // for the post call the `.apiRepr` instance method in models.js
    .then(post => res.json(post.apiRepr()))
    // error handling
    .catch(
      err => {
        console.error(err)
        res.status(500).json({message: 'Internal server error'})
      })
})

// POST requests to /posts
// Add new post and return post apiRepr json
app.post('/posts', (req, res) => {
  const requiredFields = ['title', 'content', 'author']
  requiredFields.forEach(field => {
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`
      console.error(message)
      return res.status(400).send(message)
    }
  })

  Post
    .create({
      title: req.body.title,
      content: req.body.content,
      author: req.body.author
    })
    .then(
      post => res.status(201).json(post.apiRepr()))
    .catch(err => {
      console.error(err)
      res.status(500).json({message: 'Internal server error'})
    })
})

// PUT request to posts/:id
// Update only changed fields in the post with provided id and return post apiRepr json
app.put('/posts/:id', (req, res) => {
  // ensure that the id in the request path and the one in request body match
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = (
      `Request path id (${req.params.id}) and request body id (${req.body.id}) must match`)
    console.error(message)
    return res.status(400).json({message: message})
  }

  // if the user sent fields to be updated, we udpate those values in the document
  const toUpdate = {}
  const updateableFields = ['title', 'content', 'author']

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field]
    }
  })

  Post
    // all key/value pairs in toUpdate will be updated -- that's what `$set` does
    .findByIdAndUpdate(req.params.id, {$set: toUpdate})
    .then(post => res.status(204).end())
    .catch(err => {
      console.error(err)
      res.status(500).json({message: 'Internal server error'})
    })
})

// DELETE request to /posts/:id
// Delete post with provided id
app.delete('/posts/:id', (req, res) => {
  Post
    .findByIdAndRemove(req.params.id)
    .then(post => res.status(204).end())
    .catch(err => {
      console.error(err)
      res.status(500).json({message: 'Internal server error'})
    })
})

// catch-all endpoint if client makes request to non-existent endpoint
app.use('*', function (req, res) {
  res.status(404).json({message: 'Not Found'})
})

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server

// connect to database, then starts the server and returns a promise
function runServer (databaseUrl = DATABASE_URL, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err)
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`)
        resolve()
      })
      .on('error', err => {
        mongoose.disconnect()
        reject(err)
      })
    })
  })
}

// close the server, and returns a promise
function closeServer () {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server')
      server.close(err => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  })
}

// If server.js is called directly (aka, with `node server.js`), this block runs
// But we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer().catch(err => console.error(err))
};

module.exports = {app, runServer, closeServer}