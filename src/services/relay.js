import { Loader } from "../components/loader";
import { setupLambdaLayer, removeLambdaLayer } from "./lambdaLayers";
import {
  addRelayPermissions,
  removeRelayPermissions,
} from "./relayPermissions";
import { RELAY_ID } from "../constants";

const WebSocket = require("ws");

async function createRelay(
  apiGateway,
  fullLambda,
  program,
  screen,
  lambda,
  iam,
  application
) {
  const stage = `${RELAY_ID}-dev`;
  console.log("Setting up Relay...");
  const loader = new Loader(screen, 5, 20);
  loader.load("Please wait");
  try {
    await addRelayPermissions(lambda, iam, fullLambda, stage);
    await setupLambdaLayer(lambda, fullLambda);
    const websocketAddress = await apiGateway.createWebsocket(
      fullLambda,
      program,
      stage
    );
    const relay = new WebSocket(websocketAddress);
    relay.on("open", () => {
      console.log("Warning: Realtime logs will appear faster than CloudWatch");
      application.setRelayActive(true);
      // Clear and reset logs
      application.lambdaLog.generateLog();
    });
    relay.on("message", (data) => {
      application.lambdaLog.log(data);
    });
    relay.on("close", () => {
      console.log("Relay Closed");
    });
    relay.on("error", console.error);
  } catch (e) {
    console.error("Relay Setup Failure");
    console.error(e);
  }
  loader.stop();
  loader.destroy();
}

async function takedownRelay(fullLambda, lambda, screen, application, iam) {
  console.log("Disabling relay...");
  const loader = new Loader(screen, 5, 20);
  loader.load("Please wait");
  try {
    await removeLambdaLayer(lambda, fullLambda);
    await removeRelayPermissions(lambda, iam, fullLambda);
    console.log("Relay Successfully Disabled");
    application.setRelayActive(false);
  } catch (e) {
    console.error("Relay Takedown Failure");
    console.error(e);
  }
  loader.stop();
  loader.destroy();
}

module.exports = {
  createRelay,
  takedownRelay,
};
