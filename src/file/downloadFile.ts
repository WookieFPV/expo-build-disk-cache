import fs from "node:fs";
import https from "node:https";

export async function downloadFile(
	fileUrl: string,
	outputLocationPath: string,
) {
	return new Promise<string>((resolve, reject) => {
		const file = fs.createWriteStream(outputLocationPath, {});
		https
			.get(fileUrl, (response) => {
				// Check if the request was successful (status code 2xx)
				if (
					!response.statusCode ||
					response.statusCode < 200 ||
					!response.statusCode ||
					response.statusCode >= 300
				) {
					// Clean up the partially created file
					fs.unlink(outputLocationPath, () => {
						reject(
							new Error(
								`Failed to download file. Status code: ${response.statusCode}`,
							),
						);
					});
					return;
				}

				response.pipe(file);

				file.on("finish", () =>
					file.close((err) => {
						if (err) {
							reject(err);
						} else {
							resolve(outputLocationPath);
						}
					}),
				);

				file.on("error", (err) =>
					fs.unlink(outputLocationPath, () => reject(err)),
				);
			})
			.on("error", (err) => reject(err));
	});
}
