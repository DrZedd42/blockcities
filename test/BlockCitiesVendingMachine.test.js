const lodash = require('lodash');

const BlockCities = artifacts.require('BlockCities');

const LogicGenerator = artifacts.require('LogicGenerator');
const ColourGenerator = artifacts.require('ColourGenerator');

const BlockCitiesVendingMachine = artifacts.require('BlockCitiesVendingMachine');

const {BN, constants, expectEvent, shouldFail} = require('openzeppelin-test-helpers');

contract.only('BlockCitiesVendingMachineTest', ([_, creator, tokenOwner, anyone, whitelisted, ...accounts]) => {

    const firstTokenId = new BN(1);
    const secondTokenId = new BN(2);
    const unknownTokenId = new BN(999);

    const firstURI = 'abc123';
    const baseURI = 'https://api.blockcities.co/';

    beforeEach(async function () {
        // Create 721 contract
        this.blockCities = await BlockCities.new(baseURI, {from: creator});

        // Create generators
        this.logicGenerator = await LogicGenerator.new({from: creator});
        this.colourGenerator = await ColourGenerator.new({from: creator});

        // Create vending machine
        this.vendingMachine = await BlockCitiesVendingMachine.new(
            this.logicGenerator.address,
            this.colourGenerator.address,
            this.blockCities.address,
            {
                from: creator
            }
        );

        // Add to whitelist
        await this.blockCities.addWhitelisted(this.vendingMachine.address, {from: creator});
        (await this.blockCities.isWhitelisted(this.vendingMachine.address)).should.be.true;

        await this.blockCities.addWhitelisted(whitelisted, {from: creator});
        (await this.blockCities.isWhitelisted(whitelisted)).should.be.true;

        this.basePrice = await this.vendingMachine.totalPrice(new BN(1));

        (await this.blockCities.totalBuildings()).should.be.bignumber.equal('0');
        (await this.vendingMachine.totalPurchasesInWei()).should.be.bignumber.equal('0');
    });

    context('ensure counters are functional', function () {
        beforeEach(async function () {
            // mint a single building
            const {logs} = await this.vendingMachine.mintBuilding({from: tokenOwner, value: this.basePrice});

            expectEvent.inLogs(
                logs,
                `VendingMachineTriggered`,
                {_tokenId: new BN(1), _architect: tokenOwner}
            );
        });

        it('returns total buildings', async function () {
            (await this.blockCities.totalBuildings()).should.be.bignumber.equal('1');
        });

        it('returns total purchases', async function () {
            (await this.vendingMachine.totalPurchasesInWei()).should.be.bignumber.equal(this.basePrice);
        });
        it('building has an owner', async function () {
            // tokenOwner owns token ID zero
            (await this.blockCities.tokensOfOwner(tokenOwner))[0].should.be.bignumber.equal(firstTokenId);
        });

        it('building has attributes', async function () {
            // 4 = base, body, roof, and architect
            const attrs = await this.blockCities.attributes(1);
            attrs[0].should.be.bignumber.lte('6'); // FIXME add all attrs
        });

        // FIXME - should be in BlockCities test file - create one
        it('returns Token URI', async function () {
            (await this.blockCities.tokenURI(new BN(1))).should.be.equal(baseURI + `1`);
        });

        it('returns name and symbol', async function () {
            (await this.blockCities.name()).should.be.equal(`BlockCities`);
            (await this.blockCities.symbol()).should.be.equal(`BKC`);
        });
    });

    context('price increases in steps', function () {

        it('price adjusts on invocation', async function () {
            const priceStep = await this.vendingMachine.priceStepInWei();

            const blockSale = await this.vendingMachine.lastSaleBlock();
            const priceBefore = await this.vendingMachine.totalPrice(new BN(1));

            await this.vendingMachine.mintBuilding({from: tokenOwner, value: priceBefore});

            const priceAfter = await this.vendingMachine.totalPrice(new BN(1));
            // console.log(blockSale.toString(), priceBefore.toString(), priceAfter.toString());
            priceAfter.should.be.bignumber.equal(priceBefore.add(priceStep));

            // should move step up once
            await this.vendingMachine.mintBatch(new BN(2), {from: tokenOwner, value: priceAfter.add(priceAfter) });

            const priceAfterBatch = await this.vendingMachine.totalPrice(new BN(1));
            priceAfterBatch.should.be.bignumber.equal(priceAfter.add(priceStep));
        });
    });

    context('batch mint buildings', function () {

        it('returns total buildings', async function () {
            const numberOfBuildings = new BN(3);
            const batchPrice = await this.vendingMachine.totalPrice(numberOfBuildings);
            let totalBuildingsPre = await this.blockCities.totalBuildings();

            await this.vendingMachine.mintBatch(numberOfBuildings, {from: tokenOwner, value: batchPrice});

            const totalBuildingsPost = await this.blockCities.totalBuildings();
            totalBuildingsPost.should.be.bignumber.equal(totalBuildingsPre.add(numberOfBuildings));
        });

        it('reverts as no value', async function () {
            await shouldFail.reverting(this.vendingMachine.mintBatch(new BN(3), {from: tokenOwner, value: 0}));
        });
    });

    context('batch mint buildings with credits', function () {

        it('returns total buildings', async function () {
            await this.vendingMachine.addCredit(tokenOwner, {from: creator});
            await this.vendingMachine.addCredit(tokenOwner, {from: creator});
            await this.vendingMachine.addCredit(tokenOwner, {from: creator});

            const numberOfBuildings = new BN(3);
            let totalBuildingsPre = await this.blockCities.totalBuildings();

            await this.vendingMachine.mintBatch(numberOfBuildings, {from: tokenOwner, value: 0});

            const totalBuildingsPost = await this.blockCities.totalBuildings();
            totalBuildingsPost.should.be.bignumber.equal(totalBuildingsPre.add(numberOfBuildings));
        });

    });

    context('total price and adjusting bands', function () {

        it('returns total price for one', async function () {
            const price = await this.vendingMachine.totalPrice(new BN(1));

            price.should.be.bignumber.equal(this.basePrice);
        });

        it('returns total price for three', async function () {
            const price = await this.vendingMachine.totalPrice(new BN(3));

            price.should.be.bignumber.equal(this.basePrice.mul(new BN(3)));
        });

        it('returns total price for five', async function () {
            const price = await this.vendingMachine.totalPrice(new BN(5));

            // 20% off
            price.should.be.bignumber.equal(new BN('200000000000000000'));
        });

        it('returns total price for ten', async function () {
            const price = await this.vendingMachine.totalPrice(new BN(10));

            // 30% off
            price.should.be.bignumber.equal(new BN('350000000000000000'));
        });

        it('adjusts percentage bands', async function () {
            await this.vendingMachine.setPriceDiscountBands([new BN(85), new BN(75)], {from: creator});

            // 15% off
            let price = await this.vendingMachine.totalPrice(new BN(5));
            price.should.be.bignumber.equal(new BN('212500000000000000'));

            // 25% off
            price = await this.vendingMachine.totalPrice(new BN(10));
            price.should.be.bignumber.equal(new BN('375000000000000000'));
        });

        it('adjusts percentage bands can only be done be owner', async function () {
            await shouldFail.reverting(this.vendingMachine.setPriceDiscountBands([new BN(85), new BN(75)], {from: tokenOwner}));
        });
    });

    context('ensure only owner can change base price', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.vendingMachine.setPricePerBuildingInWei(1, {from: tokenOwner}));
        });

        it('should set price if owner', async function () {
            const priceNow = await this.vendingMachine.totalPrice(new BN(1));
            const {logs} = await this.vendingMachine.setPricePerBuildingInWei(123, {from: creator});
            expectEvent.inLogs(
                logs,
                `PricePerBuildingInWeiChanged`,
                {_oldPricePerBuildingInWei: priceNow, _newPricePerBuildingInWei: new BN(123)}
            );
        });
    });

    context('ensure only owner can burn', function () {
        beforeEach(async function () {
            // mint a single building
            const {logs} = await this.vendingMachine.mintBuilding({from: tokenOwner, value: this.basePrice});

            expectEvent.inLogs(
                logs,
                `VendingMachineTriggered`,
                {_tokenId: new BN(1), _architect: tokenOwner}
            );
        });

        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.blockCities.burn(firstTokenId, {from: tokenOwner}));
        });

        it('should burn if owner', async function () {
            const {logs} = await this.blockCities.burn(firstTokenId, {from: creator});
            expectEvent.inLogs(
                logs,
                `Transfer`,
            );
            await shouldFail.reverting(this.blockCities.attributes(firstTokenId));
        });
    });

    context('ensure only owner can transfer buildings', function () {
        it('should revert if not owner', async function () {
            await shouldFail.reverting(this.blockCities.createBuilding(1, 1, 2, 1, 1, 2, 1, 0, tokenOwner, {from: anyone}));
        });

        it('should transfer if owner', async function () {
            const {logs} = await this.blockCities.createBuilding(1, 1, 1, 1, 1, 1, 1, 0, anyone, {from: creator});
            expectEvent.inLogs(
                logs,
                `BuildingMinted`,
                {
                    _to: anyone,
                    _architect: anyone
                }
            );
        });
    });

    context('ensure can not mint with less than minimum purchase value', function () {
        it('should revert if not enough payable', async function () {
            await shouldFail.reverting(this.vendingMachine.mintBuilding({
                from: tokenOwner,
                value: 0
            }));
        });
    });

    context('credits', function () {
        it('should fail if no credit and no value', async function () {
            await shouldFail.reverting(this.vendingMachine.mintBuilding({
                from: tokenOwner,
                value: 0
            }));
        });

        it('should fulfil if credit and no value', async function () {
            const {logs} = await this.vendingMachine.addCredit(tokenOwner, {from: creator});
            expectEvent.inLogs(
                logs,
                `CreditAdded`,
                {
                    _to: tokenOwner
                }
            );

            await this.vendingMachine.mintBuilding({from: tokenOwner, value: 0});
        });

        it('should add credit batch', async function () {
            await this.vendingMachine.addCreditBatch([tokenOwner, anyone], {from: creator});

            (await this.vendingMachine.credits(tokenOwner)).should.be.bignumber.equal('1');
            (await this.vendingMachine.credits(anyone)).should.be.bignumber.equal('1');
        });
    });

    context.skip('random buildings to console', function () {
        it('should mint random', async function () {
            this.basePrice = await this.vendingMachine.pricePerBuildingInWei();

            for (let i = 1; i < 13; i++) {
                const tokenId = await this.vendingMachine.mintBuilding({from: accounts[i], value: this.basePrice});
                console.log(tokenId.logs);
                const attrs = await this.blockCities.attributes(tokenId, {from: accounts[i]});
                console.log(`
                    ID: ${tokenId},
                    _exteriorColorway: ${attrs[0].toString()},
                    _windowColorway: ${attrs[1].toString()},
                    _city: ${attrs[2].toString()},
                    _base: ${attrs[3].toString()},
                    _body: ${attrs[4].toString()},
                    _roof: ${attrs[5].toString()},
                    _special: ${attrs[6].toString()},
                    _architect: ${attrs[7].toString()},
                `);
            }
        });
    });

    // FIXME - should be in BlockCities test file - create one
    context('ensure whitelisted can update base token URI', function () {
        it('should revert if not whitelisted', async function () {
            await shouldFail.reverting(this.blockCities.updateTokenBaseURI(firstURI, {from: tokenOwner}));
        });

        it('should allow if whitelisted', async function () {
            await this.blockCities.updateTokenBaseURI(firstURI, {from: whitelisted});

            const base = await this.blockCities.tokenBaseURI();
            base.should.be.equal(firstURI);
        });
    });

    context('should be able to mintBuildingTo() and define the recipient of the building', async function () {

        it('mintBuildingTo() succeeds', async function () {
            const _to = tokenOwner;
            const tokenId = new BN(1);

            const {logs} = await this.vendingMachine.mintBuildingTo(_to, {from: creator, value: this.basePrice});
            expectEvent.inLogs(
                logs,
                `VendingMachineTriggered`,
                {_tokenId: tokenId, _architect: _to}
            );

            const tokensOfOwner = await this.blockCities.tokensOfOwner(_to);
            tokensOfOwner.map(lodash.toNumber).should.be.deep.equal([tokenId.toNumber()]);
        });

    });

    context('should be able to mintBatchTo() and define the recipient of the building', async function () {

        it('mintBatchTo() succeeds', async function () {
            const _to = tokenOwner;
            const tokenId = new BN(1);

            const {logs} = await this.vendingMachine.mintBatchTo(_to, 1, {from: creator, value: this.basePrice});
            expectEvent.inLogs(
                logs,
                `VendingMachineTriggered`,
                {_tokenId: tokenId, _architect: _to}
            );

            const tokensOfOwner = await this.blockCities.tokensOfOwner(_to);
            tokensOfOwner.map(lodash.toNumber).should.be.deep.equal([tokenId.toNumber()]);
        });

    });
});
