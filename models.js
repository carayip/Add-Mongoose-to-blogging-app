const mongoose = require('mongoose')

// setup schema for posts
const postSchema = mongoose.Schema({
  title: {type: String, required: true},
  content: {type: String, required: true},
  author: {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true}
  }
})

// add virtual for nameString so it can be returned in apiRepr
// .trim() removes whitespace from both ends of string
postSchema.virtual('nameString').get(function () {
  return `${this.author.firstName} ${this.author.lastName}`.trim()
})

// setup apiRepr method
postSchema.methods.apiRepr = function () {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    author: this.nameString
  }
}

// create mongoose model for BlogPost
const Post = mongoose.model('Post', postSchema)

// export BlogPost
module.exports = {Post}