import Generator from 'yeoman-generator';
import fs from 'fs';
import to from 'to-case';
import colors from 'ansi-colors';

const tab = '    ';

export default class AuthGenerator extends Generator {
  static namespace = 'presto:auth';

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
          { name: 'Sanctum (Not implemented yet)', value: 'sanctum' }
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
    const regexprConfigAuthDefaults = /(?<='defaults'\s*=>\s*\[\n\s*'guard' => env\('AUTH_GUARD', ')[a-z][a-z0-9]*(?='\))/gmsi;
    const replaceConfigAuthDefaults = `api`;
    let configAuthFileContents = fs.readFileSync(`${this.destinationPath('server')}/config/auth.php`, { encoding: 'utf8', flag: 'r' });
    configAuthFileContents = configAuthFileContents.replace(regexprConfigAuthDefaults, replaceConfigAuthDefaults);
    fs.writeFileSync(`${this.destinationPath('server')}/config/auth.php`, configAuthFileContents, { encoding: 'utf8', flag: 'w' });

    if (this.answers.authentication === 'keycloak') {
      this.spawnCommandSync('composer', ['require', 'robsontenorio/laravel-keycloak-guard'], { cwd: 'server' });
      this.spawnCommandSync('php', ['artisan', 'vendor:publish', '--provider="KeycloakGuard\\KeycloakGuardServiceProvider"'], { cwd: 'server' });
      fs.appendFileSync(this.destinationPath(`server/.env`), `
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

      configAuthFileContents = fs.readFileSync(`${this.destinationPath('server')}/config/auth.php`, { encoding: 'utf8', flag: 'r' });
      const regexprConfigAuthGuards = /(?<='guards'\s*=>\s*\[)\s*('[a-z][a-z-0-9]*'\s*=>\s*\[.*?],?\s*)*?(?=])/gmis;
      const replaceConfigAuthGuards = `\n${tab + tab}'api' => [\n${tab + tab + tab}'driver' => 'keycloak',\n${tab + tab + tab}'provider' => 'users'\n${tab + tab}]\n${tab}`;
      configAuthFileContents = configAuthFileContents.replace(regexprConfigAuthGuards, replaceConfigAuthGuards);
      fs.writeFileSync(`${this.destinationPath('server')}/config/auth.php`, configAuthFileContents, { encoding: 'utf8', flag: 'w' });

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