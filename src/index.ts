import PluginBase from "@electron-forge/plugin-base";
import {
  ForgeMakeResult,
  ForgeMultiHookMap,
  IForgeResolvableMaker,
  ResolvedForgeConfig,
} from "@electron-forge/shared-types";
import { execSync, ExecSyncOptionsWithStringEncoding } from "child_process";

type ConfigTypes = {
  azureKeyVaultUri: string;
  azureClientId: string;
  azureTenantId: string;
  azureClientSecret: string;
  azureCertificateName: string;
};

export class ElectronForgeAzureSignToolPlugin extends PluginBase<ConfigTypes> {
  name = "azure-sign-tool-electron-forge-plugin";

  constructor(config: ConfigTypes) {
    super(config);
    this.config = config;
    console.log(`===== loading ${this.name} =====`);
    console.log(JSON.stringify(config, null, 2));

    if (
      !config.azureKeyVaultUri ||
      !config.azureClientId ||
      !config.azureTenantId ||
      !config.azureClientSecret ||
      !config.azureCertificateName
    ) {
      throw new Error(
        `You did not provide all the required config variables to ${
          this.name
        }.\nCurrent values:\n${Object.keys(config)
          .map((key) => `${key}: ${config[key as keyof ConfigTypes]}`)
          .join("\n")}`
      );
    }
  }

  getHooks(): ForgeMultiHookMap {
    return { postMake: [this.postMake] };
  }

  postMake = async (
    forgeConfig: ResolvedForgeConfig,
    makeResults: ForgeMakeResult[]
  ) => {
    // console.log(`===== ${this.name}.postMake =====`);
    // console.log(JSON.stringify({ forgeConfig, makeResults }, null, 2));

    return makeResults.map((data) => {
      const { artifacts, platform } = data;

      if (platform !== "win32") {
        return data;
      }

      // Example "artifacts": [
      //   "D:\\a\\desktop\\desktop\\out\\beta\\make\\squirrel.windows\\ia32\\RELEASES",
      //   "D:\\a\\desktop\\desktop\\out\\beta\\make\\squirrel.windows\\ia32\\appname-4.2.18-beta-win32-ia32-beta-setup.exe",
      //   "D:\\a\\desktop\\desktop\\out\\beta\\make\\squirrel.windows\\ia32\\appname-4.2.18-beta-full.nupkg"
      // ],
      artifacts.forEach((artifactPath) => {
        if (artifactPath.endsWith(".exe")) {
          this.sign(artifactPath, this.config);
        }
      });

      return data;
    });
  };

  sign(path: string, config: ConfigTypes): void {
    const execSyncSettings = {
      stdio: "inherit",
      encoding: "utf8",
      // env: {
      // 	...process.env,
      // },
    } as ExecSyncOptionsWithStringEncoding;

    const {
      azureKeyVaultUri,
      azureClientId,
      azureTenantId,
      azureClientSecret,
      azureCertificateName,
    } = this.config;

    console.log("Signing: " + path);

    try {
      execSync(
        `AzureSignTool sign \
                --azure-key-vault-url "${azureKeyVaultUri}" \
                --azure-key-vault-client-id "${azureClientId}" \
                --azure-key-vault-tenant-id "${azureTenantId}" \
                --azure-key-vault-client-secret "${azureClientSecret}" \
                --azure-key-vault-certificate ${azureCertificateName} \
                --timestamp-rfc3161 http://timestamp.digicert.com \
                --verbose \
                ${path}`,
        execSyncSettings
      );
    } catch (e) {
      console.log("Error in signFile");
      if (e instanceof Error) {
        console.log(e.message);
        throw new Error(e.message);
      } else {
        throw e;
      }
    }
  }
}
