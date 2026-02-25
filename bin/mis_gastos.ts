#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MisGastosStack } from "../lib/mis_gastos-stack";

const app = new cdk.App();
new MisGastosStack(app, "MisGastosStack", {});
