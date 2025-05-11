import fs from "node:fs/promises";
import https from "node:https";
import { logger } from "../logger.ts";

/**
 * Upload file or folder to S3 presigned URL.
 */
export async function uploadFile(
	uploadUrl: string,
	filePath: string, // File or Folder
): Promise<void> {
	try {
		const fileStats = await fs.stat(filePath);
		const fileSizeInBytes = fileStats.size;

		const fileContent = await fs.readFile(filePath);

		const options = {
			method: "PUT",
			headers: {
				"Content-Type": "application/gzip",
				"Content-Length": fileSizeInBytes,
			},
		};

		return new Promise((resolve, reject) => {
			const req = https.request(uploadUrl, options, (res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						resolve(); // Successful upload
					} else {
						reject(
							new Error(
								`Upload failed with status code: ${res.statusCode} ${res.statusMessage ?? ""}`,
							),
						);
					}
				});
			});

			req.on("error", (error) => {
				logger.error("Error during upload request:", error);
				reject(error);
			});

			req.write(fileContent); // Send the file data in the request body
			req.end();
		});
	} catch (error) {
		logger.error("Error during upload:", error);
		throw error; // Re-throw to allow the caller to handle the error
	}
}
