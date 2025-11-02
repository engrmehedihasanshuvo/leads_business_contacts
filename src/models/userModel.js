// Simple User model class representing authenticated user and access controls
export default class UserModel {
  constructor({ email = '', sheetName = '', searchLimit = 0, currentAccess = 0, totalQuery = 0, generateDataCount = 0 } = {}) {
    this.email = email;
    this.sheetName = sheetName;
    this.searchLimit = Number(searchLimit) || 0;
    this.currentAccess = Number(currentAccess) || 0;
    this.totalQuery = Number(totalQuery) || 0;
    this.generateDataCount = Number(generateDataCount) || 0;
  }

  decrementAccess() {
    if (typeof this.currentAccess !== 'number') this.currentAccess = Number(this.currentAccess) || 0;
    this.currentAccess = Math.max(0, this.currentAccess - 1);
    return this.currentAccess;
  }

  toJSON() {
    return {
      email: this.email,
      sheetName: this.sheetName,
      searchLimit: this.searchLimit,
      currentAccess: this.currentAccess,
      totalQuery: this.totalQuery,
      generateDataCount: this.generateDataCount,
    };
  }

  static fromNormalizedRow(nr = {}) {
    const safeParse = v => {
      if (v == null) return 0;
      const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
      return Number.isFinite(n) ? n : 0;
    };
    return new UserModel({
      email: nr.email || nr.e || '',
      sheetName: nr.sheet_name || nr.sheetname || nr['sheet name'] || '',
      searchLimit: safeParse(nr.search_limit_access || nr.search_limit || nr['Search Limit Access'] || '0'),
      currentAccess: safeParse(nr.current_access || nr.currentaccess || nr['Current Access'] || '0'),
      totalQuery: safeParse(nr.total_query || nr['Total Query'] || '0'),
      generateDataCount: safeParse(nr.generate_data_count || nr['Generate Data Count'] || '0'),
    });
  }
}
