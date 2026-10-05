import assert from "node:assert/strict";
import { deliveryDecision } from "../src/creator_delivery.js";

assert.equal(deliveryDecision({ subscriberEmail: "chenhua@changba.com", creatorName: "Mina" }), "deliver");
assert.equal(deliveryDecision({ subscriberEmail: "reader.example.com", creatorName: "Mina" }), "reject");
console.log("creator delivery decision tests passed");
