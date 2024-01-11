import PluginBase from "@electron-forge/plugin-base"
import {
	ForgeMakeResult,
	ForgeMultiHookMap,
	IForgeResolvableMaker,
	ResolvedForgeConfig,
} from "@electron-forge/shared-types"
import { execSync, ExecSyncOptionsWithStringEncoding } from "child_process"
import fs from "fs-extra"
import path from "path"

type ConfigTypes = {
	azureKeyVaultUri: string
	azureClientId: string
	azureTenantId: string
	azureClientSecret: string
	azureCertificateName: string
	// signToolPath: string
}

export class ElectronForgeAzureSignToolPlugin extends PluginBase<ConfigTypes> {
	name = "@joris/electron-forge-azure-sign-tool-plugin"
	
	constructor(config: ConfigTypes) {
		super(config)
		this.config = config
	}

	getHooks(): ForgeMultiHookMap {
		return { postMake: [this.postMake] }
	}

	postMake = async (
		forgeConfig: ResolvedForgeConfig,
		makeResults: ForgeMakeResult[],
	) => {
		const squirrelMaker: IForgeResolvableMaker = forgeConfig.makers.find(
			(maker) =>
				(maker as IForgeResolvableMaker)?.name ===
				"@electron-forge/maker-squirrel",
		) as IForgeResolvableMaker

		if (!squirrelMaker) {
			throw new Error(
				`The plugin ${this.name} can not work without @electron-forge/maker-squirrel. Remove it from the plugins array.`,
			)
		}

		const {
			azureKeyVaultUri,
			azureClientId,
			azureTenantId,
			azureClientSecret,
			azureCertificateName
			// signToolPath
		 } =
			this.config

		return makeResults.map((data) => {
			const { artifacts, platform } = data

			if (platform !== "win32") {
				return data
			}

			if (!azureKeyVaultUri ||
				!azureClientId ||
				!azureTenantId ||
				!azureClientSecret ||
				!azureCertificateName
				// !signToolPath
			) {
				throw new Error(
					`You did not provide all the required config variables to ${
						this.name
					}.\nCurrent values:\n${Object.keys(this.config)
						.map((key) => `${key}  -  ${this.config[key as keyof ConfigTypes]}`)
						.join("\n")}`,
				)
			}

			const releasesPath = artifacts[0]

			/**
			 * The exe is located where RELEASES is.
			 */
			if (releasesPath.endsWith("RELEASES")) {
				/**
				 * We first parse the RELEASES file to get out the .nupkg file name
				 * saved there. If setupExe wasn't changed in the squirrel maker
				 * config, then we can use this parsed name to get the .exe file
				 * name as well.
				 *
				 * If setupExe was set, then we need to use that instead to get
				 * the correct .exe path for signing.
				 */
				const nupkgFileName = fs
					.readFileSync(releasesPath, "utf8")
					.split(" ")[1]

				const nupkgFilePath = releasesPath.replace("RELEASES", nupkgFileName)

				const exeName = squirrelMaker.config?.setupExe
					? squirrelMaker.config?.setupExe
					: nupkgFileName.replace("-full.nupkg", ".exe")

				const exeFilePath = releasesPath.replace("RELEASES", exeName)

				const execSyncSettings = {
					stdio: "inherit",
					encoding: "utf8",
					// env: {
					// 	...process.env,
					// },
				} as ExecSyncOptionsWithStringEncoding

				/**
				 * We sign all the .exe files?
				 */
				try {
					execSync(
						`AzureSignTool sign \
							--azure-key-vault-url "${ azureKeyVaultUri }" \
							--azure-key-vault-client-id "${ azureClientId }" \
							--azure-key-vault-tenant-id "${ azureTenantId }" \
							--azure-key-vault-client-secret "${ azureClientSecret }" \
							--azure-key-vault-certificate ${ azureCertificateName } \
							--timestamp-rfc3161 http://timestamp.digicert.com \
							--verbose \
							${exeFilePath}`,
						execSyncSettings,
					)
				} catch (e) {
					if (e instanceof Error) {
						throw new Error(e.message)
					} else {
						throw e
					}
				}
			}

			return data
		})
	}
}

// module.exports = ElectronForgeAzureSignToolPlugin
