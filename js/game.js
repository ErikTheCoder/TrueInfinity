class Game {
	constructor(data) {
		this.prestige = {};
		
		if (data) {
			if (data.prestige) {
				for (let i in data.prestige) {
					this.prestige[i] = l(data.prestige[i]);
				}
			}
		}
		
		this.time = data ? (data.time || 0) : 0;	
		this.asintv = data ? (data.asintv || 10) : 10;
		this.as = JSON.parse(data ? (JSON.stringify(data.as) || true) : true);

		this.maxAllCooldown = 0;
		this.max_layer = data ? (data.max_layer || [0]) : [0];	
	}
	
	update() {
		this.time++;
		for (let i in this.prestige) {
			this.prestige[i].update();
			if (!this.prestige[i].initiated) {
				this.prestige[i].init();
			}
		}
		this.maxAllCooldown > 0 ? this.maxAllCooldown-- : null;
	}
	
	get disp_time() {
		if (this.time < 1200) {
			return (Math.floor(this.time / 20)).toString() + ' seconds';
		} else if (this.time < 72000) {
			return (Math.floor(this.time / 1200)).toString() + ' minutes';
		} else if (this.time < 1728000) {
			return (Math.floor(this.time / 72000)).toString() + ' hours';
		} else if (this.time < 12096000) {
			return (Math.floor(this.time / 1728000)).toString() + ' days';
		} else {
			return 'too long';
		}
	}
}

class Layer {
	constructor(loc, points, power, dims, tslp) {
		this.loc = loc || [0];
		this.str_loc = JSON.stringify(this.loc);
		
		this.points = n(points || 0);
		this.power = n(power || 0);
		
		this.dims = dims ? dims.map(x => d(x)) : [new Dimension(0, loc)];
		
		this.tslp = tslp || 0;
		this.initiated = false;
		this.mult = n(1);
	}
	
	init() {
		this.initiated = true;
		createLayer(this.loc);
	}
	
	get next_loc() {
		let next_loc = JSON.parse(this.str_loc);
		next_loc[0]++;
		return next_loc;
	}
	
	incPoints(n) {
		this.points = OmegaNum.add(n, this.points);
	}
	
	incPower(n) {
		this.power = OmegaNum.add(n, this.power);
	}
	
	subPoints(n) {
		this.points = OmegaNum.sub(this.points, n);
	}
	
	update() {
		this.mult = getMult(this.loc);
		
		if (this.points.gt('ee6')) {
			this.mult = this.mult.pow(1e6);
		}
		
		this.generate();
		
		if (this.dims[this.dims.length - 1].amount.gt(0)) {
			this.dims.push(new Dimension(this.dims[this.dims.length - 1].dim.add(1), this.loc));
		}
		
		if (this.dims[this.dims.length - 1].dim.gte(10) && this.dims.length > 3) {
			removeElem('g' + this.str_loc + this.dims[1].id);
			this.dims.splice(1, 1);
		}
		
		for (let i = 0; i < this.dims.length; i++) {
			if (document.getElementById('b' + this.str_loc + JSON.stringify(this.dims[i].id))) {
				document.getElementById('b' + this.str_loc + JSON.stringify(this.dims[i].id)).onclick = () => game.prestige[this.str_loc].dims[i].buy();
				document.getElementById('b2' + this.str_loc + JSON.stringify(this.dims[i].id)).onclick = () => game.prestige[this.str_loc].dims[i].buyMax();
			}
		}
		
		this.tslp++;
	}
	
	generate() {
		if (this.dims[this.dims.length - 1].dim.gte(10)) {
			this.dims[0].amount = this.dims[0].amount.add(secretFormula(this.tslp, this.dims[1].dim, this.dims[1].amount, this.dims[1].mult));
			let p = this.dims[0].mult.mul(this.dims[0].amount).div(20);
			this.str_loc == '[0]' ? this.incPoints(p) : this.incPower(p);
		} else {
			for (let d of this.dims) {
				let p = d.mult.mul(d.amount).div(20);
				let dm = d.dim;
				if (dm.eq(0)) {
					this.str_loc == '[0]' ? this.incPoints(p) : this.incPower(p);
				} else {
					this.dims[d.dim.sub(1).toNumber()].amount = this.dims[d.dim.sub(1).toNumber()].amount.add(p);
				}
			}
		}
	}
	
	maxAll() {
		if (game.maxAllCooldown == 0) {
			if (this.dims.length >= 3) {
				let x = this.dims[2].dim;
				let val = x.mul(1.1);
				if (this.dims[1].dim.gt(15) && new Dimension(val, this.loc, 0, 0).afford) {
					this.dims.push(new Dimension(val, this.loc, 1, 1));
				} else {
					for (let d of this.dims) {
						d.buy();
						d.buyMax();
					}
				}
			} else {
				for (let d of this.dims) {
					d.buy();
					d.buyMax();
				}
			}
			game.maxAllCooldown = 3;
		}
	}
	
	clear() {
		if (this.str_loc == '[0]') {
			this.points = n(10);
		} else {
			this.points = n(0);
		}
		this.power = n(0);
		this.tslp = 0;
		this.dims = [new Dimension(0, this.loc)];
	}
}

class Dimension {
	constructor(dim, loc, amount, bought) {
		this.dim = n(dim || 0);
		
		this.loc = loc || [0];
		this.str_loc = JSON.stringify(this.loc);
		
		this.amount = n(amount || 0);
		this.bought = n(bought || 0);
		
		this.price_start = OmegaNum.pow(10, this.dim.add(1));
		
		this.id = Math.floor(Math.random() * 10000000000);
	}
	
	get mult() {
		return OmegaNum.pow(2, this.bought).mul(game.prestige[this.str_loc].mult);
	}
	
	get price() {
		return OmegaNum.pow(this.dim.lt(100) ? 10 : this.dim.mul(0.9), this.dim.add(1).mul(this.bought.add(1)));
	}
	
	get afford() {
		return game.prestige[this.str_loc].points.gte(this.price);
	}
	
	get next_str_loc() {
		let x = JSON.parse(this.str_loc);
		x[0]++;
		return JSON.stringify(x);
	}
	
	buy() {
		if (this.afford) {
			let pc = this.price;
			this.amount = this.amount.add(1);
			this.bought = this.bought.add(1);
			
			game.prestige[this.str_loc].subPoints(pc);
			
			return true;
		} else {
			return false;
		}
	}
	
	get max_afford() {
		return OmegaNum.affordGeometricSeries(game.prestige[this.str_loc].points, this.price_start, OmegaNum.pow(this.dim.lt(100) ? 10 : this.dim, this.dim.add(1)), this.bought);
	}
	
	get max_price() {
		return OmegaNum.sumGeometricSeries(this.max_afford, this.price_start, OmegaNum.pow(this.dim.lt(100) ? 10 : this.dim, this.dim.add(1)), this.bought);
	}
	
	buyMax() {
		if (this.afford) {
			let ma = this.max_afford;
			let mp = this.max_price;
			
			if (ma.lt(1e6)) {
				this.amount = this.amount.add(ma);
				this.bought = this.bought.add(ma);
				
				game.prestige[this.str_loc].subPoints(mp);
				
				return true;
			}
		}
		return false;
	}
}