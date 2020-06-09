

// Required libraries
const ibm = require('ibm-cos-sdk');
const fs = require('fs')
require('dotenv').config();

const config = {
	endpoint: process.env.COS_ENDPOINT,
	apiKeyId: process.env.COS_API_KEY_ID,
	ibmAuthEndpoint: process.env.COS_AUTH_ENDPOINT,
	serviceInstanceId: process.env.COS_SERVICE_CRN,
};

var cos = new ibm.S3(config);

// filename will be "key"
// 사용 예시 : await uploadVoice(newBucketName, newLargeFileName, buffer)
//
module.exports.upload = async (bucketName, fileName, fileBuffer) => {

	if (fileBuffer == null) {
		throw new Error("file Buffer is empty!")
	}

	try {

		const uploadInfo = {
			Bucket: bucketName,
			Key: fileName
		}

		const uploadRequestInfo = await cos.createMultipartUpload(uploadInfo)
																				.promise()

		uploadInfo.UploadId = uploadRequestInfo.UploadId

		// 파일을 부분으로 나누어 비동기로 업로드
		await startMultiPartUpload(
			uploadInfo,
			fileBuffer,
		)

	} catch (error) {
		throw error
	}

}

// Retrieve the list of contents for a bucket
module.exports.getBucketContents = async (bucketName) => {

	try {

		console.log(`Retrieving bucket contents from: ${bucketName}`);

		const bucketInfo = { Bucket: bucketName }

		const data = await cos.listObjects(bucketInfo)
														.promise()

		return data.Contents

	} catch (err) {
		throw err
	}
}

// Retrieve a particular item from the bucket
module.exports.getItem = async (bucketName, itemName) => {

	try {

		const objectInfo = {
			Bucket: bucketName,
			Key: itemName
		}

		const data = await cos.getObject(objectInfo)
														.promise()

		if (data) {
			return Buffer.from(data.Body)
		}

	} catch (err) {
		throw err
	}
}


// Delete item
module.exports.deleteItem = async (bucketName, itemName) => {
	
	try {

		console.log(`Deleting item: ${itemName}`);

		const objectInfo = {
			Bucket: bucketName,
			Key: itemName
		}

		await cos.deleteObject(objectInfo)
							.promise()

		console.log(itemName, "삭제 성공")

	} catch (err) {
		throw err
	}
}

/**** Private Function ****/

const splitFileSize = async (fileLength, splitUnit) => {

	var fractionCnt = Math.ceil(fileLength / splitUnit);

	var fractions = []

	for (var i = 0; i < fractionCnt; i++) {

		fractions.push({
			start: i * splitUnit,
			end: Math.min(
				i * splitUnit + splitUnit, 
				fileLength
			)
		})
	}

	return fractions
}

// 파일을 부분으로 나누어 비동기로 업로드
const startMultiPartUpload = async (uploadInfo, fileBuffer) => {

	try {

		const splitSizeUnit = 1024 * 1024 * 5

		const fractions = await splitFileSize(
			fileBuffer.length,
			splitSizeUnit
		)

		const uploadedDataResults = await Promise.all(

			fractions.map((eachFileSize, idx) => {
				
				return cos.uploadPart({
					Body: fileBuffer.slice(
						eachFileSize.start,
						eachFileSize.end
					),
					PartNumber: idx + 1,
					...uploadInfo,
				}).promise()
			})
		)

		// Commit Data
		await cos.completeMultipartUpload({
			...uploadInfo,
			MultipartUpload: {
				Parts: uploadedDataResults.map((result, idx) => {
					result.PartNumber = idx + 1
					return result
				})
			},
		}).promise()

		console.log("업로드 성공!")

	} catch (err) {

		cancelMultiPartUpload(uploadInfo)

		throw err
	}
}

const cancelMultiPartUpload = async (uploadInfo) => {
	try {

		await cos.abortMultipartUpload(uploadInfo).promise()

		console.log(`Multi-part upload aborted for ${uploadInfo.Key}`);

	} catch (e) {
		console.log(
			"canceling multipart itself, error ",
			e
		)
	}
}
