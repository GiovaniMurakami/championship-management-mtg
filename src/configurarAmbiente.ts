import { carregarEnv } from "./helpers/carregarEnv";

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  carregarEnv();
}
