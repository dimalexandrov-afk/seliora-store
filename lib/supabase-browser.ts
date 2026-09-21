import {createClient} from '@supabase/supabase-js';

const url='https://yclgswebvkiilmescehw.supabase.co';
const key='sb_publishable_i8wviNRTktw1iSJhOUsp2Q_vOJzZj7Z';

export const supabase=createClient(url,key);
