var request = require("request")
var rp = require('request-promise');
var MongoClient = require('mongodb').MongoClient
var cron = require('node-cron');
var Nightmare = require('nightmare');		
var nightmare = Nightmare({ show: true });


// ================CRON=============================================
//runs every 1 min
cron.schedule('*/1 * * * *', function(){
	console.log(Date())
  callRequest();
});




// ================CALL=============================================
function callRequest(){
rp({uri:"http://www.coincap.io/front"})
    .then(function (data) {
        filterData(JSON.parse(data));
	})
}



// ================FILTER DATA=============================================
function filterData(data){

	const coinNames = ['USD', 'BTC', 'ETH', 'XRP', 'LTC', 'XMR', 'ETC', 'DASH', 'MAID', 'DOGE', 'ZEC', 'LSK'];

	// this array contains all of the important info
	var coinArr = [];

	for (var i = 0; i < data.length; i++){
		//if the name matches anything in the coinNames Array
		if (coinNames.indexOf(data[i].short) >= 0){
			coinArr.push(data[i])
		}
	}
	updateDB(coinArr)
}




// ================UPDATE DB=============================================

function updateDB(coinArr){

	// Use connect method to connect to the server
	MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {

		// get all data from database
	  	db.collection('botCollections').find().toArray(function(err, data) {

	  		//move price column to pastPrice column
	  		for (var key in data){
	  			db.collection('botCollections').update({index:key}, {$set:{pastPrice:data[key].price}})
	  		}

	  		//update price column
	  		for (var key in coinArr){
	  			db.collection('botCollections').update({index:key}, {$set:{price:coinArr[key].price}})
			}

			mongoMath(db)

		});	

	})
}


// ================FIND % CHANGE=============================================

function mongoMath(db){

	db.collection('botCollections').find().toArray(function(err, data){
		var highestCoin = 
		{
			name: "",
			change: 0
		}

		var lowestCoin = 
		{
			name: "",
			change: 0
		}

		for (var key in data){
			var currentPrice = parseFloat(data[key].price)
			var pastPrice = parseFloat(data[key].pastPrice)

			if (((currentPrice - pastPrice)/currentPrice) > highestCoin.change){
				highestCoin.change = (currentPrice - pastPrice)/currentPrice;
				highestCoin.name = data[key].short
			}

			if (((currentPrice - pastPrice)/currentPrice) < lowestCoin.change) {
				lowestCoin.change = (currentPrice - pastPrice)/currentPrice;
				lowestCoin.name = data[key].short
			}
		}

		console.log(highestCoin)
		console.log(lowestCoin)
		startNightmare(highestCoin,lowestCoin)

	})

}




// ================NIGHTMARE=============================================

function startNightmare(highestCoin, lowestCoin){

	

	nightmare
	  .goto('http://localhost:8000')
	  .wait('#transfer-button > span')
	  .wait(3000)
	  .type('#input_6', 55)
	  .wait(3000)
	  .click("#select_option_13 > div.md-text.ng-binding")
	  .wait(3000)
	  .click('#select_option_7 > div.md-text.ng-binding')
	  .wait(3000)
	  .click('#transfer-button > span')
	  .catch(function (error) {
	    console.error('Search failed:', error);
	  });
}