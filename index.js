require('dotenv').config()
const express = require('express');
const cors = require('cors')
const app = express();
const router = express.Router();
const config = require('./config/database');
const mongoose = require('mongoose');
const path = require('path');

//there is order here if you put blogs above authentication it will not require a token
const authentication = require('./routes/authentication')(router);
const users = require('./routes/users')(router);
const rooms = require('./routes/rooms')(router);
const blogs = require('./routes/blogs')(router);
const categorys = require('./routes/categories')(router);
const inventory = require('./routes/inventory')(router);

const PORT = process.env.PORT || 3000;


mongoose.Promise = global.Promise;
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

mongoose.connect(config.uri, config.options, (err) => {
    if (err) {
        console.log('cant connect to database ' + process.env.DB_NAME);
    } else {
        console.log('connected to the database ' + process.env.DB_NAME);
    }
});

// Add Access Control Allow Origin headers

//once live change it to the server side ip
app.use(cors());


// app.use(cors({
//     origin: 'http://localhost:4200'
// }))

//body-parser built in express middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// will allow all link || not good
//app.use(cors())

//for development mode
app.use(express.static(__dirname + '/app/dist/'));
app.use('/images', express.static(path.join(__dirname, './images')));
app.use('/upload', express.static(path.join(__dirname, './upload')));

app.use('/authentication', authentication);
app.use('/users', users);
app.use('/rooms', rooms);
app.use('/blogs', blogs);
app.use('/categories', categorys);
app.use('/inventory', inventory);


app.get('*', (req, res) => {
    //  res.send('<h1>Hello from the Server Side</h1>')
    res.sendFile(path.join(__dirname + '/app/dist/index.html'),)
});


app.listen(PORT, () => {
    console.log('Connected on port ' + PORT);
});





