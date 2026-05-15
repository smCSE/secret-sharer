import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xxojziddnzorkhlgfhtp.supabase.co'; 
const supabaseKey = 'sb_publishable_GM50BhAK_zDGKurhzUPuNw_aLpHrlU7'; 

export const supabase = createClient(supabaseUrl, supabaseKey);