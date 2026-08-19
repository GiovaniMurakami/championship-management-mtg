import { LAMBDA_BINARY_MEDIA_TYPES } from "../../src/helpers/lambdaBinaryMedia";

describe("LAMBDA_BINARY_MEDIA_TYPES", () => {
  it("marca imagens e octet-stream como binário na Lambda", () => {
    expect(LAMBDA_BINARY_MEDIA_TYPES).toEqual(
      expect.arrayContaining(["image/*", "application/octet-stream"]),
    );
  });
});
