const { Kafka, logLevel } = require('kafkajs');
const request = require('request-promise');
// const { Client: KafkaClient, Producer: KafkaProducer } = Kafka;

const kafka = new Kafka({
    clientId: 'health-check-app',
    brokers:  [process.env.BROKER_ENDPOINT],
    logLevel: logLevel.INFO,
  });

// Kafka configuration
// const kafkaClient = new KafkaClient({ kafkaHost: 'your_kafka_bootstrap_servers' }); // Update with your Kafka bootstrap servers
const producer = kafka.producer();

// Kafka topic
const kafkaTopic = 'test';

// ConfigMap name
const configMapName = 'health-check-config';

async function getHealthCheckURI() {
    // Use Kubernetes API to get health check URI from ConfigMap
    const Client = require('kubernetes-client').Client;
    const config = require('kubernetes-client/backends/in-cluster');
    const client = new Client({ backend: config });

    const configMap = await client.api.v1.namespaces('default').configmaps(configMapName).get();
    return configMap.body.data['uri'];
}

async function publishToKafka(uri) {
    // Produce message to Kafka topic
    const payload = [{ topic: kafkaTopic, messages: JSON.stringify({ uri }) }];
    producer.send(payload, (err, data) => {
        if (err) {
            console.error(`Error publishing to Kafka: ${err}`);
        } else {
            console.log(`Published to Kafka: ${JSON.stringify(data)}`);
        }
    });
}

async function healthCheck(uri) {
    try {
        await request(uri);
        return true;
    } catch (error) {
        return false;
    }
}

async function main() {
    while (true) {
        const healthCheckURI = await getHealthCheckURI();

        if (healthCheckURI) {
            try {
                if (await healthCheck(healthCheckURI)) {
                    console.log(`URI ${healthCheckURI} is healthy`);
                } else {
                    console.log(`URI ${healthCheckURI} is not healthy`);
                }

                // Publish URI to Kafka
                await publishToKafka(healthCheckURI);
            } catch (error) {
                console.error(`Error during health check: ${error}`);
            }
        }

        // Sleep for a defined interval (e.g., 5 minutes)
        await new Promise(resolve => setTimeout(resolve, 300000));
    }
}

main();
