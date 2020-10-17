const mongoose = require("mongoose");
var express = require("express");
var session = require("express-session");
var bodyParser = require("body-parser");
var cors = require("cors");
var helmet = require("helmet");
var morgan = require("morgan");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/counter?retryWrites=true&w=majority`;
var options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  keepAlive: 300000,
  connectTimeoutMS: 30000,
  useCreateIndex: true,
  useNewUrlParser: true
};

mongoose.connect(uri, options);
var db = mongoose.connection;
db.on("error", console.error.bind(console, "Erreur lors de la connexion"));
db.once("open", function() {
  console.log("Connexion à la base OK");
});

var logSchema = mongoose.Schema({
  created_at: { type: Date, default: Date.now },
  kind: { type: String },
  value: { type: Number, default: 1 }
});
var Log = mongoose.model("Log", logSchema);

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
  session({
    secret: "super secret key",
    resave: false,
    saveUninitialized: true
  })
);

var myRouter = express.Router();

app.use(helmet());
app.use(bodyParser.json());
app.use(cors());
app.use(morgan("combined"));
app.use(myRouter);
app.listen(80, "127.0.0.1", function() {
  console.log("Listening");
});
const pipeline = [
  {
    $group: {
      _id: "$kind",
      count: { $sum: 1 }
    }
  }
];

myRouter
  .route("/")
  .get(function(req, res) {
    Log.aggregate(pipeline, function(err, results) {
      if (err) {
        res.send(err);
      }
      res.json(results);
    });
  })
  .post(function(req, res) {
    Log.create({ kind: req.body.kind, value: req.body.value }).then(() => {
      Log.aggregate(pipeline, function(err, results) {
        if (err) {
          res.send(err);
        }
        res.status(201);
        res.json(results);
      });
    });
  });
