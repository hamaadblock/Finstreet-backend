const Role = require("../models/role.model");
const db = require("../models");
const dbConfig = require("../config/db.config");

function initialize() {
    db.mongoose
        .connect(`mongodb+srv://${dbConfig.USERNAME}:${dbConfig.PASSWORD}@${dbConfig.HOST}.2zcxqbv.mongodb.net/${dbConfig.DB}?retryWrites=true&w=majority`,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        )
        .then(() => {
            console.log("Successfully connect to MongoDB.");
            Role.estimatedDocumentCount((err, count) => {
                if (!err && count === 0) {
                    new Role({
                        name: "user"
                    }).save(err => {
                        if (err) {
                            console.log("error", err);
                        }

                        console.log("added 'user' to roles collection");
                    });

                    new Role({
                        name: "moderator"
                    }).save(err => {
                        if (err) {
                            console.log("error", err);
                        }

                        console.log("added 'moderator' to roles collection");
                    });

                    new Role({
                        name: "admin"
                    }).save(err => {
                        if (err) {
                            console.log("error", err);
                        }

                        console.log("added 'admin' to roles collection");
                    });
                }
            });
        })
        .catch(err => {
            console.error("Connection error", err);
            process.exit();
        });
}

module.exports = initialize;