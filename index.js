/* =============================================================
// =============================================================


	This bot transacts highest % change every 30 seconds


// =============================================================
// ============================================================= */ 



//https://github.com/rosshinkley/nightmare-examples/blob/master/docs/beginner/promises.md

var request = require("request")
var rp = require('request-promise');
var MongoClient = require('mongodb').MongoClient
var cron = require('node-cron');
var Nightmare = require('nightmare');		
var nightmare = Nightmare({ show: true });

// ================LOG USING NIGHTMARE=============================================
nightmare
	  .goto('http://localhost:8000') //go to site
	  .wait('body > div.container > a:nth-child(1)') //wait login appears on the screen
	  .wait(3000)
	  .click('body > div.container > a:nth-child(1)') // click login
	  .wait('body > div.container > ng-view > form > div:nth-child(3) > input[type="submit"]') //wait until button appears on screen
	  .type('body > div.container > ng-view > form > div:nth-child(1) > input', "leon")
	  .type('body > div.container > ng-view > form > div:nth-child(2) > input', 'password')
	  .click('body > div.container > ng-view > form > div:nth-child(3) > input[type="submit"]')


// ================CRON=============================================
//runs every 30 second
cron.schedule('*/30 * * * * *', function(){
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

		//{ name: 'LSK', change: 0.003942627965467904 }
		console.log(highestCoin)
		// { name: 'BTC', change: -0.006667927269832153 } 
		console.log(lowestCoin)	

		if (highestCoin.change !== 0 || lowestCoin.change !== 0){
			nightmareTransaction(highestCoin,lowestCoin)
		}

	})

}




// ================NIGHTMARE TRANSACTION=============================================

function nightmareTransaction(highestCoin, lowestCoin){
		
		var dropDownArray = ['LSK', 'ZEC','DOGE', 'MAID', 'DASH', 'ETC', 'XMR', 'LTC', 'XRP', 'ETH', 'BTC', 'USD']
		
		var pathNumber = dropDownArray.indexOf(highestCoin.name) + 10

		var dropDownPath ='#select_option_' + pathNumber + ' > div.md-text.ng-binding'

		nightmare
		  .wait('#transfer-button > span')
		  .wait(3000)
		  .evaluate(function(){
		  	// FROM SELECTOR
		  	return document.querySelector('#select_option_7 > div.md-text.ng-binding').innerHTML
		  })
		  .then(function(result){
		  	var input = result.trim().split(' ')[1]
		  	return nightmare
		  	.type('#input_6', "")		//clears amount to transfer
			.type('#input_6', input)	// enters amout to transfer
			.wait(3000)
			.click('#select_option_7 > div.md-text.ng-binding') // TO dropdown
			.wait(3000)
			.click(dropDownPath)	// from dropdown
			.click('#input_6')		// click input to close dropdown
			.wait(3000)
			.click('#transfer-button > span')	
			.wait(3000)
			//.refresh()	  
		  })
		  .catch(function (error) {
		    console.error('nightmare transaction error:', error);
		});

}