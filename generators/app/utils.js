import colors from 'ansi-colors';

class Utils {
    hello(log) {
        log(colors.redBright(`\nIt's a Bird? It's a Plane? It's Superman? `) + colors.blueBright(`It's a `) + colors.bold.blueBright(`Rocket Elephant`) + colors.redBright('!\n'));
        log(colors.blue(` ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄ `) + colors.redBright('  ▄▄▄'));
        log(colors.blueBright(` ▄▀▀█ ▄▀▀█ ▄▀▀ ▄▀▀ ▀█▀ ▄▀▀█ `) + colors.white('   ▄▄') + colors.blueBright('▄▄▄▄'));
        log(colors.blueBright(` █▄▄▀ █▄▄▀ █▀▀ ▀▀█  █  █  █ `) + colors.yellowBright('■■█') + colors.white('██') + colors.blueBright('███▄█'));
        log(colors.blueBright(` █    ▀ ▀▀ ▀▀▀ ▀▀   ▀  ▀▀▀  `) + colors.white('   ▀▀') + colors.blueBright('▀▀▀▀█') + colors.whiteBright('▀'));
        log(colors.blue(` ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀ `) + colors.redBright('  ▀▀▀') + colors.blueBright('   ▀'));
        log(`\n${colors.bold.blueBright(`Presto`)}: ${colors.bold.whiteBright(`P`)}${colors.white(`hp, `)}${colors.bold.whiteBright(`RE`)}${colors.white(`act, `)}${colors.bold.whiteBright(`S`)}${colors.white(`ql `)}${colors.bold.whiteBright(`TO`)}${colors.white(`olkit`)} ${colors.yellow(`v.0.2.0`)}`);
    }
}

export default Utils;