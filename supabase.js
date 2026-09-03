const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    "https://ufgxadjxwnusxtxkfsqd.supabase.co",
    "sb_publishable_a1BE6xyK81SeKzWqRd7ekg_OkoGxqGx"
);

module.exports = supabase;
