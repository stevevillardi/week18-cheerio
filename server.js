// Dependencies
const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const path = require("path");

// Requiring Note and Article models
const Note = require("./models/Note.js");
const Article = require("./models/Article.js");

// Scraping tools
const request = require("request");
const cheerio = require("cheerio");

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

//Define port
const port = process.env.PORT || 3000;

// Initialize Express
const app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);

// Make public a static dir
app.use(express.static("public"));

// Set Handlebars.
const exphbs = require("express-handlebars");

app.engine(
    "handlebars",
    exphbs({
        defaultLayout: "main",
        partialsDir: path.join(__dirname, "/views/layouts/partials")
    })
);
app.set("view engine", "handlebars");

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/nyt-scraper", { useMongoClient: true });
const db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
    console.log("Mongoose connection successful.");
});

// Routes
// ======

//GET requests to render Handlebars pages
app.get("/", function(req, res) {
    Article.find({ saved: false }, function(error, data) {
        let hbsObject = {
            article: data
        };
        console.log(hbsObject);
        res.render("home", { article: data });
    });
});

app.get("/saved", function(req, res) {
    Article.find({ saved: true })
        .populate("notes")
        .exec(function(error, articles) {
            let hbsObject = {
                article: articles
            };
            res.render("saved", hbsObject);
        });
});

//Start of API routes
app.delete("/api/clear/scraped", function(req, res) {
    Article.deleteMany({ saved: false }, function(error) {
        res.render("home");
    });
});

app.delete("/api/clear/saved", function(req, res) {
    Article.deleteMany({ saved: true }, function(error) {
        res.render("saved");
    });
});

// A GET request to scrape the website
app.get("/api/scrape", function(req, res) {
    // First, we grab the body of the html with request
    request("https://www.nytimes.com/", function(error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        let $ = cheerio.load(html);
        // Now, we grab every h2 within an article tag, and do the following:
        $("article").each(function(i, element) {
            // Save an empty result object
            let result = {};

            // Add the title and summary of every link, and save them as properties of the result object

            summary = "";
            if ($(this).find("ul").length) {
                summary = $(this)
                    .find("li")
                    .first()
                    .text();
            } else {
                summary = $(this)
                    .find("p")
                    .text();
            }

            result.title = $(this)
                .find("h2")
                .text();
            result.summary = summary;
            result.link =
                "https://www.nytimes.com" +
                $(this)
                    .find("a")
                    .attr("href");

            // Using our Article model, create a new entry
            // This effectively passes the result object to the entry (and the title and link)
            let entry = new Article(result);

            // Now, save that entry to the db
            entry.save(function(err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
                // Or log the doc
                else {
                    console.log(doc);
                }
            });
        });
        // Tell the browser that we finished scraping the text
        res.send("Scrape Complete");
    });
});

// This will get the articles we scraped from the mongoDB
app.get("/api/articles", function(req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Or send the doc to the browser as a json object
        else {
            res.json(doc);
        }
    });
});

// Grab an article by it's ObjectId
app.get("/api/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    Article.findOne({ _id: req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        // now, execute our query
        .exec(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            // Otherwise, send the doc to the browser as a json object
            else {
                res.json(doc);
            }
        });
});

// Save an article
app.post("/api/articles/save/:id", function(req, res) {
    // Use the article id to find and update its saved boolean
    Article.findOneAndUpdate({ _id: req.params.id }, { saved: true })
        // Execute the above query
        .exec(function(err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            } else {
                // Or send the document to the browser
                res.send(doc);
            }
        });
});

// Delete an article
app.post("/api/articles/delete/:id", function(req, res) {
    // Use the article id to find and update its saved boolean
    Article.findOneAndUpdate(
        { _id: req.params.id },
        { saved: false, notes: [] }
    )
        // Execute the above query
        .exec(function(err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            } else {
                // Or send the document to the browser
                res.send(doc);
            }
        });
});

// Create a new note
app.post("/api/notes/save/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    let newNote = new Note({
        body: req.body.text,
        article: req.params.id
    });
    console.log(req.body);
    // And save the new note the db
    newNote.save(function(error, note) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise
        else {
            // Use the article id to find and update it's notes
            Article.findOneAndUpdate(
                { _id: req.params.id },
                { $push: { notes: note } }
            )
                // Execute the above query
                .exec(function(err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    } else {
                        // Or send the note to the browser
                        res.send(note);
                    }
                });
        }
    });
});

// Delete a note
app.delete("/api/notes/delete/:note_id/:article_id", function(req, res) {
    // Use the note id to find and delete it
    Note.findOneAndRemove({ _id: req.params.note_id }, function(err) {
        // Log any errors
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            Article.findOneAndUpdate(
                { _id: req.params.article_id },
                { $pull: { notes: req.params.note_id } }
            )
                // Execute the above query
                .exec(function(err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    } else {
                        // Or send the note to the browser
                        res.send("Note Deleted");
                    }
                });
        }
    });
});

// Listen on port
app.listen(port, function() {
    console.log("App running on port " + port);
});