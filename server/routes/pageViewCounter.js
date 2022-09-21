require('dotenv').config();

const AWS = require('aws-sdk');
AWS.config.update({
    region: 'ap-southeast-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
});

var express = require('express');
var router = express.Router();

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const bucketName = "n10664599-assignment";
const s3Key = `pageViewCounter`;

(async () => {
    console.log("Create Bucket");
    try {
        await s3.createBucket({ Bucket: bucketName }).promise();
        console.log(`Created bucket: ${bucketName}`);
    } catch (err) {
        if (err.statusCode !== 409) {
            console.log(`Error creating bucket: ${err}`);
        }
    }
})();

router.get('/', async (req, res, next) => {
    const params = { Bucket: bucketName, Key: s3Key };

    try {
        // Serve from S3
        const s3Result = await s3.getObject(params).promise();
        const s3JSON = JSON.parse(s3Result.Body);
        // Increment Page View Count
        let updatedPageViewCounter = {
            pageViewCounter: parseInt(s3JSON.pageViewCounter) + 1
        }
        console.log(`Successfully retrieved data from ${bucketName}/${s3Key}`);
        const objectParams = { Bucket: bucketName, Key: s3Key, Body: JSON.stringify(updatedPageViewCounter) };
        await s3.putObject(objectParams).promise();
        res.json(updatedPageViewCounter);
    } catch (err) {
        if (err.statusCode === 404) {
            // Upload Initial Page View Count 0
            let initialPageViewCounter = {
                pageViewCounter: 0
            };
            const objectParams = { Bucket: bucketName, Key: s3Key, Body: JSON.stringify(initialPageViewCounter) };
            // await s3.createBucket({ Bucket: bucketName }).promise();
            await s3.putObject(objectParams).promise();
            console.log(`Successfully uploaded data to ${bucketName}/${s3Key}`);
            res.json(initialPageViewCounter);
        } else {
            // Something else went wrong when accessing S3
            console.error(err)
            res.status(err.statusCode).send(err);
        }
    }
});

module.exports = router;