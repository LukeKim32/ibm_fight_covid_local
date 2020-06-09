
const storage = require('../storage/api')
const dbClient = require('../models/client')

exports.saveSpeechFile = async (req, res) => {

	// req를 텍스트를 받아서
	// db에 저장
	const db = dbClient.getCollection("korea")

	const newNewsData = {
		text : req.body.text
	}

	const result = await db.insertOne(newNewsData)

	// console.log("db 저장 결과", result)

	if (result.ok){

	} else {
		// Error Handling
	}

	// 왓슨 sdk를 이용

	// 왓슨 sdk 결과를 스토리지에 저장

	// 스토리지에 저장된 경로/key를 db에 저장

	// ok 응답

	res.statusCode = 200;
	res.end("Hello world!")

}