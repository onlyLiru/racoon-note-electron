import path    from 'path';
import {icons} from './icons.conf';

interface BasicConfInterface {
    ROOT_PATH: string
    ICONS: any
    SERVICE_PATH: string
    MODULE_PATH: string
    STATICS_PATH: string;
    CACHE_PATH: string;
}

const basicConf: BasicConfInterface | any = {};

basicConf.ROOT_PATH    = path.join(__dirname, '..');
basicConf.ICONS        = icons;
basicConf.SERVICE_PATH = path.join(basicConf.ROOT_PATH, 'service');
basicConf.MODULE_PATH  = path.join(basicConf.ROOT_PATH, 'module/');
basicConf.HTML_PATH    = path.join(basicConf.ROOT_PATH, 'html/');
basicConf.STATICS_PATH = path.join(basicConf.ROOT_PATH, 'statics/');
basicConf.CACHE_PATH   = path.join(basicConf.ROOT_PATH, '..', 'cache');

export default basicConf
