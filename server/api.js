const { Router } = require("express");
const jwt = require("jsonwebtoken");
const { database } = require("./db");
const bcrypt = require("bcrypt");

const DBG = 1;
function debug(message) {
    if (DBG) {
        console.log(message);
    }
}

const USE_AUTH = 1;
if (process.env.USE_AUTH === 'false') {
    USE_AUTH = 0;
    console.log("Authentication is turned off");
}

function generateAccessToken(username) {
    // token expires in 1 hour (3600 seconds)
    return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '3600s' });
}

function authenticateToken(req, res, next) {
    if (USE_AUTH) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        console.log(`auth token=${token}`);
        
        if (token == null) {
            return res.sendStatus(401);
        }
        
        jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
            console.log(err)
            
            if (err) return res.sendStatus(403)
            
            req.user = user
            
            next()
        })
    } else {
        next();
    }
}

const saltRounds = 10;

const router = new Router();

router.post("/terms/add", authenticateToken, function (req, res) {
    const term = req.body.term;
    const def = req.body.definition;
    const contrib = req.body.contributorId;

    const query =
        "INSERT INTO terms (term, definition, contributor_id) VALUES ($1, $2, $3) RETURNING id";
    
    database
        .query(query, [term, def, contrib])
        .then((result) => res.json({message: "Term added", id: result.rows[0].id}))
        .catch((e) => {
            console.error(e)
            res.json({error: e});
        });
});

router.post("/terms/update", authenticateToken, function (req, res) {
    const termid = req.body.termid;
    const term = req.body.term;
    const def = req.body.definition;
    const contrib = req.body.contributorId;

    const query =
          "UPDATE terms set term=$1, definition=$2, contributor_id=$3 WHERE id=$4";
    
    database
        .query(query, [term, def, contrib, termid])
        .then((result) => {
            debug(result);
            if (result.rowCount === 0) {
                res.json({message: "Error.  Term not updated"})
            } else {
                res.json({message: "Term updated"})
            }
        })
        .catch((e) => {
            console.error(e)
            res.json({error: e});
        });
});

router.post("/terms/delete", authenticateToken, function (req, res) {
    const termid = req.body.termid;

    const query =
          "DELETE from terms WHERE id = $1";
    
    database
        .query(query, [termid])
        .then((result) => {
            debug(result);
            if (result.rowCount === 0) {
                res.json({message: "Error.  Term not deleted"})
            } else {
                res.json({message: "Term deleted"})
            }
        })
        .catch((e) => {
            console.error(e);
            res.json({error: e});
        });
});

router.post("/terms/resources/add", authenticateToken, function (req, res) {
    const termid = req.body.termid;
    const link = req.body.link;  
    const linktype = req.body.linktype; // video or web
    const language = req.body.language;

    const query =
          "INSERT INTO term_resources (termid, link, linktype, language) VALUES ($1,$2,$3,$4) RETURNING id";
    
    database
        .query(query, [termid, link, linktype, language])
        .then((result) => res.json({message: "Term resource added", id: result.rows[0].id}))
        .catch((e) => {
            console.error(e)
            res.json({error: e});
        });
});

router.post("/terms/resources/update", authenticateToken, function (req, res) {
    const res_id = req.body.resourceid;
    const termid = req.body.termid;
    const link = req.body.link;
    const linktype = req.body.linktype;
    const language = req.body.language;

    const query =
          "UPDATE term_resources set termid=$1, link=$2, linktype=$3, language=$4 where id=$5";
    
    database
        .query(query, [termid, link, linktype, language, res_id])
        .then((result) => {
            if (result.rowCount === 0) {
                res.json({message: "Error.  Term resource not updated"})
            } else {
                res.json({message: "Term resource updated"})
            }
        })
        .catch((e) => {
            console.error(e)
            res.json({error: e});
        });
});

router.post("/terms/resources/delete", authenticateToken, function (req, res) {
    const res_id = req.body.resourceid;

    const query =
          "DELETE from term_resources where id = $1";
    
    database
        .query(query, [res_id])
        .then((result) => {
            if (result.rowCount === 0) {
                res.json({message: "Error.  Term resource not deleted"})
            } else {
                res.json({message: "Term resource deleted"})
            }
        })
        .catch((e) => {
            console.error(e)
            res.json({error: e});
        });
});

router.get("/terms", function (req, res) {
    const query = "SELECT id, term, definition FROM terms";
    database
        .query(query)
        .then((result) => {
            debug(result);
            if (result.rowCount === 0) {
                res.json([]);
            } else {
                debug(result);
                res.json(result.rows);
            }
        })
        .catch((e) => {
            console.error(e);
            res.json({error: e});
        });
});

router.get("/terms/term", function (req, res) {
    const termid = req.body.termid;
    const query = "SELECT id, term, definition FROM terms WHERE id = $1";
    database
        .query(query, [termid])
        .then((result) => {
            debug(result);
            if (result.rowCount === 0) {
                res.json({message: `term with id of {termid} was not found`});
            } else {
                debug(result);
                res.json(result.rows[0]);
            }
        })
        .catch((e) => {
            console.error(e);
            res.json({error: e});
        });
});

router.get("/term/resources", function (req, res) {
    const termid = req.body.termid;
    const query = "SELECT id, link, linktype, language FROM term_resources where termid = $1";
    database
        .query(query,[termid])
        // .query(query)
        .then((result) => {
            debug(result);
            if (result.rowCount === 0) {
                res.json([]);
            } else {
                debug(result);
                res.json(result.rows);
            }
        })
        .catch((e) => {
            console.error(e);
            res.json({error: e});
        });
});

router.get("/contributors", authenticateToken, function (req, res) {
    database.query("SELECT id, contributor_name, email, region FROM contributors")
        .then((result) => {
            if (result.rowCount === 0) {
                res.json({message: "no contributors !!!"});
            } else {
                debug(result);
                res.json(result.rows);
            }
        })
        .catch((e) => {
            console.error(e);
            res.json({error: e});
        });
});

router.post("/contributor/login", async function (req, res) {
    const email = req.body.email;
    
    const query =
          "SELECT id, password from contributors where email = $1";

    database
        .query(query, [email])
        .then((result) => {
            // await bcrypt.compare(password, hash);
            debug(result);
            if (result.rowCount === 0) {
                res.json({message: "Incorrect Email"});
            } else {
                (async () => {
                    // Hash fetched from DB
                    const hash = result.rows[0].password;
                    const userId = result.rows[0].id;

                    // Check if password is correct
                    const isValidPass = await bcrypt.compare(req.body.password, hash);

                    if (isValidPass) {
                        debug(`user with id ${userId} is authenticated`);
                        const token = generateAccessToken({ username: req.body.email });
                        res.json({auth:token, userid:userId});
                    } else {
                        res.json({message: "Incorrect Password"});
                    }
                })();
            }
        })
        .catch((e) => {
            console.error(e)
            res.json({error: e});
        });
});

router.post("/newContributor", authenticateToken, async function (req, res) {
    const name = req.body.name;
    const email = req.body.email;
    const region = req.body.region;
    const pass = await bcrypt.hash(req.body.password, saltRounds)

    console.log(`password is ${pass}`);

    const query =
          "INSERT INTO contributors (contributor_name, region, email, password) VALUES ($1,$2,$3,$4) RETURNING id";
    
    database
        .query(query, [name, region, email, pass])
        .then((result) => res.json({message: "Contributor added", id: result.rows[0].id}))
        .catch((e) => {
            console.error(e)
            res.json({error: e});
        });
});

// req is the Request object, res is the Response object
// (these are just variable names, they can be anything but it's a convention to call them req and res)
router.get("/", function (req, res) {
  res.send("Glossary Server v1.0");
});

module.exports = router;
