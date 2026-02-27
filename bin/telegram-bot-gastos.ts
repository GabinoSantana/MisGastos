#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TelegramBotGastosStack } from "../lib/telegram-bot-gastos-stack";

const app = new cdk.App();
new TelegramBotGastosStack(app, "TelegramBotGastosStack", {});
