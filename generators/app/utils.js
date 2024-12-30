import colors from 'ansi-colors';

class Utils {
    hello(log) {
        //    ###############                                                 
        //     ###############                                                
        //      ############### ########  ########  ######  ########  ####### 
        // =======     ######## ##     ## ##       ##    ##    ##    ##     ##
        //  =====     ########  ##     ## ##       ##          ##    ##     ##
        //   ===     ########   ########  ######    ######     ##    ##     ##
        //    ========          ##   ##   ##             ##    ##    ##     ##
        //     ========         ##    ##  ##       ##    ##    ##    ##     ##
        //      ========        ##     ## ########  ######     ##     ####### 
        log(colors.cyan('   ###############                                                 '));
        log(colors.cyan('    ###############                                                '));
        log(colors.cyan('     ############### ########  ########  ######  ########  ####### '));
        log(colors.cyanBright('=======') + colors.cyan('     ######## ##     ## ##       ##    ##    ##    ##     ##'));
        log(colors.cyanBright(' =====') + colors.cyan('     ########  ##     ## ##       ##          ##    ##     ##'));
        log(colors.cyanBright('  ===') + colors.cyan('     ########   ########  ######    ######     ##    ##     ##'));
        log(colors.cyanBright('   ========') + colors.cyan('          ##   ##   ##             ##    ##    ##     ##'));
        log(colors.cyanBright('    ========') + colors.cyan('         ##    ##  ##       ##    ##    ##    ##     ##'));
        log(colors.cyanBright('     ========') + colors.cyan('        ##     ## ########  ######     ##     ####### '));
        log(`\n${colors.bold.blueBright(`Presto`)}: ${colors.bold.whiteBright(`P`)}${colors.white(`hp, `)}${colors.bold.whiteBright(`RE`)}${colors.white(`act, `)}${colors.bold.whiteBright(`S`)}${colors.white(`ql `)}${colors.bold.whiteBright(`TO`)}${colors.white(`olkit`)} ${colors.yellow(`v.0.2.0`)}`);
    }
}

export default Utils;