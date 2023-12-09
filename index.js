const { Kafka, logLevel } = require('kafkajs');
const axios = require('axios');
const request = require('request');
require('dotenv').config()

async function publishToKafka(result) {
  const kafka = new Kafka({
    clientId: 'health-check-app',
    brokers: [process.env.BROKER_ENDPOINT],
  // brokers: ["localhost:9092"],
    logLevel: logLevel.INFO,
    // sasl: {
    //   mechanism: 'plain', // scram-sha-256 or scram-sha-512
    //   username: process.env.SASL_USERNAME,
    //   password: process.env.SASL_PASSWORD
    // }
  });
  // kcat -C -b "my-kafka-controller-0.my-kafka-controller-headless.default.svc.cluster.local:9092" -t health-check-topic -o beginning

  const producer = kafka.producer();

  await producer.connect();
  console.log('Connected to Kafka producer');
  await producer.send({
    topic: "test",
    messages: [
      { key: 'key1', value: JSON.stringify(result), partition: 0 },
    ]
  });
  await producer. disconnect();
}

async function performHealthCheck() {
  try {
    const uri = process.env.URI
    const response =  await axios.get(uri,);
    console.log("response code:: "+response.status);
    console.log("response server:: "+response.headers.server);
    console.log("response code:: "+response.headers.expires);
    console.log("response code:: "+response.headers.date);

    if (response.status === 200) {
      return { 
       status: 'success',
       message: 'Health check passed',
       server:response.headers.server,
       expires:response.headers.expires,
       date:response.headers.date
      };
    } else {
      return { 
        status: 'error',
        message: 'Health check failed',
        server:null,
        expires:null,
        date:null
       };
    }
  } catch (error) {
    return { 
      status: 'error',
      message: 'Health check failed',
      server:null,
      expires:null,
      date:null
     };
  }
}

async function runHealthCheck(){
  const retries = process.env.RETRIES || 6;
  for(let attempt=1; attempt<=retries;attempt++){
    console.log(`Attempt ${attempt}/${retries}`);
    const result = await performHealthCheck();
    console.log("result:::" +result);
    if( result.status == 'success'){
      console.log('Health check passed. Publishing result to Kafka.');
      await publishToKafka(result);
//      process.exit(0);
    }else if( result.status == 'error' && attempt == retries){
      await publishToKafka(result);
  //    process.exit(0);
    }
    else {
      console.log(`Health check failed. Retrying after delay...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds delay before retry
    }
  }
  console.log(`Health check failed after ${retries} retries. Exiting.`);
  process.exit(1);

}

runHealthCheck();


// async function publishToKafka(producer, uri, status, responseTime) {
//   try {
//     const kafkaResponse = await producer.send({
//       topic: 'test',
//       messages: [
//         {
//           key: uri,
//           value: JSON.stringify({ uri, status, responseTime }),
//         },
//       ],
//     });
//     console.log(kafkaResponse);
//     console.log(`Published to Kafka topic: Service ${uri}, Status: ${status}`);
//   } catch (error) {
//     console.error('Kafka publishing error:', error);
//   }
// }

// const healthPerformance = async () => {
//   try {
//     const producer = await connectKafkaProducer();

//     // Fetch URI from ConfigMap
//     // const uri = process.env.URI
//     const uri = process.env.URI;
    
//     if (!uri) {
//       console.error('URI not provided in environment variable');
//       process.exit(1);
//     }

//     const results = [];
//     const start = performance.now();
//     try {
//       // Simulating an HTTP request to the service URL   
//       let retryCount = 0;   
//       let maxRetries = process.env.maxRetries || 3; // Set a default value if maxRetries is not provided

//       const makeHttpRequest = async () => {
//         return new Promise((resolve, reject) => {
//           http.get(uri, (res) => {
//             resolve(res);
//           }).on('error', (error) => {
//             reject(error);
//           });
//         });
//       };

//       while (retryCount < maxRetries) {
//         try {
//           const res = await makeHttpRequest();
//           const end = performance.now();
//           const responseTime = end - start;
//           console.log(res.statusCode);

//           if (res.statusCode === 200) {
//             results.push({ URI: uri, status: 'OK', responseTime });
//             publishToKafka(producer, uri, 'OK', responseTime);
//             break; // Exit the loop if status code is 200
//           } else {
//             results.push({ URI: uri, status: 'ERROR', responseTime: null });
//             publishToKafka(producer, uri, 'ERROR', null);
//           }
//         } catch (error) {
//           results.push({ URI: uri, status: 'ERROR', responseTime: null });
//           publishToKafka(producer, uri, 'ERROR', null);
//         }

//         retryCount++;
//       }
//     } catch (error) {
//       console.error('Error:', error);
//     } finally {
//       await producer.disconnect();
//       console.log('Disconnected from Kafka producer');
//     }
//   } catch (error) {
//     console.error('Error:', error);
//   } finally {
//     process.exit(0);
//   }
// };

// app.listen(3002, () => {
//   console.log('Server listening on port 3002');
//   healthPerformance(); // Call healthPerformance once the server is started
// });
