var express = require('express');
var router = express.Router();
var userRepository = require('../repository/userRepository');
var Repo = new userRepository();
const uuidv4 = require('uuid/v4');
const moment = require('moment');
const axios = require("axios");

//get all users
router.get('/', (req, res) => {
    Repo.getAll().then(users => {
        res.status(200).json(users);
    }).catch(err => {
        res.status(500).json(err);
    })
})

//get user by id
router.get('/:id', (req, res) => {
    Repo.getById(req.params.id).then(x => {
        res.status(200).json(x);
    }).catch(err => {
        res.status(500).json(err);
    })
})

//get user by uuid
router.get('/uuid/:uuid', (req, res) => {
    Repo.getByUuid(req.params.uuid).then(x => {
        res.status(200).json(x);
    }).catch(err => {
        res.status(500).json(err);
    })
})

//update user
router.put('/:id', (req, res) => {
    Repo.updateUser(req.params.id, req.body).then(x => {
        console.log(x)
        res.status(200).json(x);
    }).catch(err => {
        console.log(err)
        res.status(500).json(err);
    })
})

//post user
router.post('/', (req, res) => {
    var user = req.body;
    user.id = uuidv4();
    var date = moment().format('YYYY-MM-DD HH:mm:ss');
    user.createdAt = date

    Repo.create(user).then(x => {
        res.status(200).json(x);
    }).catch(err => {
        res.status(500).json(err);
    })
})

//get user by uuid
router.get('/usageByDay/:startDate/:endDate',(req, res) => {
    var token=req.header('Authorization');
    var tokenSegments=token.split(' ');
    var actualToken=tokenSegments[1];
     
    getUsageByDay(req.params.startDate,req.params.endDate,actualToken).then(x=>{
        // console.log(x)
        res.status(200).json(x);
    }).catch(x=>{
        res.status(500).json(x);
    })
   
})

router.get('/weeklyPrice/:orgId', async (req, res) =>{
    var token=req.header('Authorization');
    var tokenSegments=token.split(' ');
    var actualToken=tokenSegments[1];

    //we compare current week to last week and check the difference of usage
    //later we multiply the differnece with the water price
    var start = moment().subtract(7,'days').format('YYYY-MM-DD')
    var end = moment().add(2,'days').format('YYYY-MM-DD')
    var week_start = moment().subtract(14,'days').format('YYYY-MM-DD')
    var week_end = moment().subtract(5,'days').format('YYYY-MM-DD')
    savedMoney(req.params.orgId).then(async x=>{
        var usage_week_one = await getUsageByDay(start,end,actualToken);
        var usage_week_two = await getUsageByDay(week_start,week_end,actualToken);
        var sum_week_one = usage_week_one[0][1].sumOfAvgL;
        var sum_week_two = usage_week_two[0][1].sumOfAvgL;
        var difference = sum_week_two-sum_week_one

        var waterPrice = x.waterTotal / 100
        var wasteWater = x.sewageTotal / 100
        var waterSaved = (difference * waterPrice).toFixed(0)
        var sewageSaved = (difference * wasteWater).toFixed(0)
        var total = (difference * x.total/100).toFixed(0)
        
        res.status(200).json({waterSaved, sewageSaved, total})    
    }).catch(err=>{
        res.status(500).json(err)
    })
})

//point calculation
//->  usage of my user in a day -> todays data token ???? 
//-> avrage of all users in a day -> constant
//-> constant national baseline -> for a day 100liters per day

//generate points in the monthly competition every day
// function getPointToday(){
//     //getting all the users 
//     var avgAllToday = 0;
//     var users = getAllUsers();
//     if (users != null) {

//     }
// }

function savedMoney(orgId){
    return new Promise((resolve, reject) => {
    const requestUri = `https://waterworks.senti.cloud/settings/price/${orgId}`;
        axios.get(requestUri).then(x => {
            resolve(x.data)
        }).catch(err=>{
            reject(err)
     })
})}

function getAllUsers(){
    return new Promise((resolve, reject) =>{
        Repo.getAll().then(users => {
            resolve(users)
        }).catch(err => {
            reject(null)
        })
    })
}

function getUsageByDay(startDate,endDate,token) {
    return new Promise((resolve, reject) => {
        const requestUri = `https://dev.services.senti.cloud/databroker/v2/waterworks/data/usagebyday/${startDate}/${endDate}`;
        axios.get(requestUri, {headers :{ 'Authorization': 'Bearer ' + token}}).then(x => {
            var data = [];
            data.push([...x.data])
            var sum = 0;

            data[0].forEach(item => {
                item.sumOfAvgM3 = (item.averageFlowPerDay),
                item.sumOfAvgMl = (item.averageFlowPerDay * 100),
                item.sumOfAvgL= (item.averageFlowPerDay * 1000).toFixed(0)
                sum += item.averageFlowPerDay

                // console.log(item)
            });
            data.push([{
                sumOfAvgM3:(sum),
                sumOfAvgMl:(sum * 100),
                sumOfAvgL:(sum * 1000).toFixed(0)
            }])
     
            resolve(data);
        }).catch(error => {
            reject(error);
        });         
    });
}
module.exports = router;