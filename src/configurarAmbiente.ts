import dotenv from "dotenv";

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  dotenv.config();
}
