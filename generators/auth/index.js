import Generator from 'yeoman-generator';
import fs from 'fs';
import to from 'to-case';
import colors from 'ansi-colors';

const tab = '    ';

export default class AuthGenerator extends Generator {
  static namespace = 'pninja:auth';

  constructor(args, opts) {
    super(args, opts);
    this.option('fromMain', {
      type: Boolean,
      default: false
    });
  }

  async prompting() {
    let prompts = [];
    if (this.options["fromMain"]) {
      prompts = [...prompts, ...[{
        store: true,
        type: "list",
        name: "authentication",
        message: `Which ${colors.yellow('*type*')} of authentication would you like to use?`,
        choices: [
          { name: 'Keycloak', value: 'keycloak' },
          { name: 'Sanctum (Not implemented yet)', value: 'sanctum' },
          { name: 'No authentication (Not implemented yet)', value: 'none' }
        ]
      }]]
    }
    this.answers = await this.prompt(prompts);
  }

  configuring() {
    for (const key in this.answers) {
      this.config.set(key, this.answers[key]);
    }
    this.config.save();
  }

  async writing() {
    if (this.answers.authentication === 'none') {
      return;
    }
    if (this.answers.authentication === 'keycloak') {
      this.spawnCommandSync('composer', ['require', 'robsontenorio/laravel-keycloak-guard'], { cwd: 'server' });
      this.spawnCommandSync('php', ['artisan', 'vendor:publish', '--provider="KeycloakGuard\\KeycloakGuardServiceProvider"'], { cwd: 'server' });

      const envContent = this.fs.read(this.destinationPath(`server/.env`));
      fs.writeFileSync(this.destinationPath('server/.env'), envContent + `
KEYCLOAK_REALM_PUBLIC_KEY=null
# How to get realm public key? Click on "Realm Settings" > "Keys" > "Algorithm RS256" Line > "Public Key" Button
KEYCLOAK_LOAD_USER_FROM_DATABASE=false
KEYCLOAK_USER_PROVIDER_CREDENTIAL='username'
KEYCLOAK_TOKEN_PRINCIPAL_ATTRIBUTE='preferred_username'
KEYCLOAK_APPEND_DECODED_TOKEN=false
KEYCLOAK_ALLOWED_RESOURCES=account
KEYCLOAK_IGNORE_RESOURCES_VALIDATION=false
KEYCLOAK_LEEWAY=0
KEYCLOAK_TOKEN_INPUT_KEY=null`, { encoding: 'utf8', flag: 'w' });

      if (this.fs.exists(`${this.destinationPath('server')}/config/auth.php`)) {
        fs.unlinkSync(`${this.destinationPath('server')}/config/auth.php`);
      }
      this.fs.copyTpl(this.templatePath("keycloak.auth.php.ejs"), `${this.destinationPath('server')}/config/auth.php`);
      let bootstrapAppFileContents = fs.readFileSync(`${this.destinationPath('server')}/bootstrap/app.php`, { encoding: 'utf8', flag: 'r' });
      const regexprBootstrapAppUse = /(?=use Illuminate\\Foundation\\Application;)/gmis;
      const replaceBootstrapAppUse = `use Illuminate\\Http\\Request;\nuse KeycloakGuard\\Exceptions\\KeycloakGuardException;\nuse KeycloakGuard\\Exceptions\\TokenException;\n`;
      bootstrapAppFileContents = bootstrapAppFileContents.replace(regexprBootstrapAppUse, replaceBootstrapAppUse);
      const regexprBootstrapAppExc = /(?<=->withExceptions\(function \(Exceptions \$exceptions\) {)\n\s+\/\/\n\s+(?=}\)->create\(\);)/gmis;
      const replaceBootstrapAppExc = `
      $exceptions->render(function (KeycloakGuardException $e, Request $request) {
          if ($request->is('api/*')) {
              return response()->json([
                  'message' => $e->getMessage()
              ], 401);
          }
      });
      `;
      bootstrapAppFileContents = bootstrapAppFileContents.replace(regexprBootstrapAppExc, replaceBootstrapAppExc);
      fs.writeFileSync(`${this.destinationPath('server')}/bootstrap/app.php`, bootstrapAppFileContents, { encoding: 'utf8', flag: 'w' });
    }
  }
}