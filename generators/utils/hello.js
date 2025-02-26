import colors from 'ansi-colors';
export function hello(log) {
  log(colors.whiteBright(`
    ************                                                            
  ***********+=*****       8888888b.  888b    888 d8b           d8b         
 ***********-..:******     888   Y88b 8888b   888 Y8P           Y8P         
 *********+:....*******    888    888 88888b  888                           
***-....::......=*******   888   d88P 888Y88b 888 888 88888b.  8888  8888b. 
***=.......=-...:+*******  8888888P"  888 Y88b888 888 888 "88b "888     "88b
****+-....+%%*....:-+****  888        888  Y88888 888 888  888  888 .d888888
*******=...=-........-***  888        888   Y8888 888 888  888  888 888  888
*******+......::----=+***  888        888    Y888 888 888  888  888 "Y888888
 ******+....-+**********                                        888         
 *******=..-***********    //pninja.tech                       d88P         
   *******+***********                                       888P"          
        ************                                                        
`));
  log(`\n${colors.bold.whiteBright(`PNinja`)} ${colors.yellow(`v.0.2.0`)} | Yeoman generator for ${colors.whiteBright(`PHP`)}, ${colors.whiteBright(`SQL`)}, ${colors.whiteBright(`JavaScript`)} modern web applications`);
}
