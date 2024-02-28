const colors = require('ansi-colors');

const hello = (log) => {
// log(colors.redBright('               ▄▄▄'));
// log(colors.blue('┏┓            ') + colors.white('  ▄▄') + colors.blueBright('▄▄▄▄'));
// log(colors.blue('┃┃┏┓┏┓┏╋┏┓   ') + colors.yellowBright('■■█') + colors.white('██') + colors.blueBright('███▄█'));
// log(colors.blue('┣┛┛ ┗ ┛┗┗┛    ') + colors.white('  ▀▀') + colors.blueBright('▀▀▀▀█') + colors.white('▀'));
// log(colors.redBright('               ▀▀▀') + colors.blueBright('   ▀'));
// log(`${colors.bold.blueBright(`Presto`)}: ${colors.bold.whiteBright(`P`)}${colors.whiteBright(`hp, `)}${colors.bold.whiteBright(`RE`)}${colors.whiteBright(`act, `)}${colors.bold.whiteBright(`S`)}${colors.whiteBright(`ql `)}${colors.bold.whiteBright(`TO`)}${colors.whiteBright(`olkit`)} ${colors.yellow(`v.0.1.0`)}`)
log(colors.blueBright('    ____  ________  _____/ /_____ ') + `   ` + colors.redBright('  ▄▄▄'));
log(colors.blueBright('   / __ \\/ ___/ _ \\/ ___/ __/ __ \\') + `   ` + colors.white('   ▄▄') + colors.blueBright('▄▄▄▄'));
log(colors.blueBright('  / /_/ / /  /  __(__  ) /_/ /_/ /') + `   ` + colors.yellowBright('■■█') + colors.white('██') + colors.blueBright('███▄█'));
log(colors.blueBright(' / .___/_/   \\___/____/\\__/\\____/ ') + `   ` + colors.white('   ▀▀') + colors.blueBright('▀▀▀▀█') + colors.whiteBright('▀'));
log(colors.blueBright('/_/                               ') + `   ` + colors.redBright('  ▀▀▀') + colors.blueBright('   ▀'));
log(`\n${colors.bold.blueBright(`Presto`)}: ${colors.bold.whiteBright(`P`)}${colors.white(`hp, `)}${colors.bold.whiteBright(`RE`)}${colors.white(`act, `)}${colors.bold.whiteBright(`S`)}${colors.white(`ql `)}${colors.bold.whiteBright(`TO`)}${colors.white(`olkit`)} ${colors.yellow(`v.0.1.0`)}`);
}

module.exports = {
    hello
}