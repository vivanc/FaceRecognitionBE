const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
const knex = require("knex");

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: "vivi",
    password: 12345,
    database: "smart-brain",
  },
});

// db.select("*")
//   .from("users")
//   .then((data) => console.log(data));

const app = express();

// middle ware to parse json file using bodyparser
app.use(bodyParser.json());
app.use(cors());

// const database = {
//   users: [
//     {
//       id: "123",
//       name: "john",
//       email: "john@gmail.com",
//       password: "qq",
//       entries: 0,
//       joined: new Date(),
//     },
//     {
//       id: "124",
//       name: "sally",
//       email: "sally@gmail.com",
//       password: "bananaaa",
//       entries: 0,
//       joined: new Date(),
//     },
//   ],
// };

app.get("/", (req, res) => {
  res.send("success");
});

app.post("/signin", (req, res) => {
  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then((data) => {
      console.log("this is data: ");
      console.log(data);
      // const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      const isValid = true; // ffneed to debug

      if (isValid == true) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", req.body.email)
          .then((user) => {
            res.json(user[0]);
          })
          .catch((err) => res.status(400).json("email or password invalid"));
      } else {
        res.status(400).json("wrong credentials");
      }
    })
    .catch((err) => res.status(400).json("wrong credentials"));
});

app.post("/register", (req, res) => {
  const { email, password, name } = req.body;
  const hash = bcrypt.hashSync(password);

  db.transaction((trx) => {
    trx
      .insert({
        hash: hash,
        email: email,
      })
      .into("login")
      .returning("email")
      .then((loginEmail) => {
        trx("users") //return??
          .returning("*")
          .insert({
            // loginEmail[0] means knex always returns an array, we want to access the first element in the array, and access 'email' property
            email: loginEmail[0].email,
            name: name,
            joined: new Date(),
          })
          .then((response) => {
            // user[0] means knex returns an array and to access the first element, it contains the user information aligned with whats in users database table (id, name, email, entries, joined)
            console.log("this is the returned response: ");
            console.log(response);
            res.json(response[0]);
            // console.log("this is the res user[0]: ");
            // console.log(response[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
    // dont want to send err to expose the data inserted, so make a err message in res.json
  }).catch((err) =>
    res.status(400).json("unable to register, db transaction failed.")
  );
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;
  let found = false;
  db.select("*")
    .from("users")
    .where({
      id: id,
    })
    .then((user) => {
      //becuase empty arry (result from non exist id) results boolean true which is not an err.f
      if (user.length) {
        res.json(user[0]);
      } else {
        res.status(400).json("user not exist");
      }
    });
});

app.put("/image", (req, res) => {
  const { id } = req.body;
  db("users")
    .where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then((entries) => res.json(entries[0].entries))
    .catch((err) => res.status(400).json("unable to get entries"));
});

app.listen(3000, () => {
  console.log("app is running on port 3000!");
});

/*

we will use postman to test our server, and then connect to front end
so to draft, our endpoints needed:

root route = / --> response = this is working
sign in --> POST response = success/fail
register --> POST response = new user object
profile/:userId --> GET response = user object
image --> PUT (update scores on user profile) --> response = updated user object

*/
