export const RESERVED_WORDS = new Set([
    // Laravel automatic timestamps and soft deletes
    'created_at', 'updated_at', 'deleted_at',

    // Common reserved words for all SQL databases
    'add', 'all', 'alter', 'and', 'as', 'asc', 'between', 'by', 'case', 'check',
    'column', 'constraint', 'create', 'cross', 'current', 'database', 'default',
    'delete', 'desc', 'distinct', 'drop', 'else', 'exists', 'foreign', 'from',
    'full', 'group', 'having', 'in', 'index', 'inner', 'insert', 'intersect',
    'into', 'is', 'join', 'key', 'left', 'like', 'limit', 'not', 'null', 'on',
    'or', 'order', 'outer', 'primary', 'references', 'right', 'select', 'set',
    'table', 'then', 'to', 'union', 'unique', 'update', 'values', 'when', 'where',

    // Common SQL types
    'int', 'integer', 'bigint', 'smallint', 'float', 'double', 'decimal', 'numeric',
    'char', 'varchar', 'text', 'blob', 'date', 'time', 'timestamp', 'boolean',

    // Critical Laravel Eloquent methods
    'attributes', 'connection', 'exists', 'fill', 'save', 'touch', 'fresh',

    // PNinja reserved words
    'ac_rule', 'user'
]);

export const RESERVED_TABLE_NAMES = new Set([
    // Laravel table names
    'cache', 'cache_locks', 'failed_jobs', 'job_batches', 'jobs', 'migrations', 'password_reset_tokens', 'personal_access_tokens', 'sessions', 'users',

    // PNinja table names
    'ac_rules', 'audits',
]);

export function isReservedWord(word) {
    return RESERVED_WORDS.has(word.toLowerCase());
}

export function isReservedTableName(word) {
    return RESERVED_TABLE_NAMES.has(word.toLowerCase());
}