import {read_n_bytes, read_string} from "./read_buffer";
import {PokemonGen1Structure} from "./PokemonGen1Structure";
import {MEMORY_SIZE, OFFSET, TYPES} from "./static-data";
import {AbstractSaveDataReader} from "../AbstractSaveDataReader";
import {Pokemon} from "../PokeTypes";


export class Gen1SaveDataReader extends AbstractSaveDataReader{

    buffer !: Uint8Array;

    constructor(private filename: string) {
        super();

    }

    init(){
        return fetch(this.filename)
            .then(res => res.arrayBuffer())
            .then(ab => new Uint8Array(ab))
            .then(uintArray => this.buffer = uintArray)
            .then(() => this);
    }


    get_save_data () {
        return {
            player_name: read_string(this.buffer, OFFSET.PLAYER_NAME),
            rival_name: read_string(this.buffer, OFFSET.RIVAL_NAME),
            party: this.get_party_info(),
            boxes: Array(12)
                .fill(0)
                .map((_, i) => this.get_box_info(i))
        }
    }

    private get_box_info(box_index: number) {
        const box_offset = box_index < 6
            ? OFFSET.BOX.BOX_1 + box_index * MEMORY_SIZE.BOX
            : OFFSET.BOX.BOX_7 + (box_index-6) * MEMORY_SIZE.BOX;
        const first_pk_offset = box_offset + OFFSET.BOX.POKEMONS;

        const poke_count = this.buffer[box_offset];

        return Array(poke_count).fill(0).map((_, i) => {
            const pokeG1 = this.get_poke(first_pk_offset + i * MEMORY_SIZE.POKEMON_IN_BOX);
            const nickname = read_string(this.buffer, box_offset + OFFSET.BOX.POKEMON_NAMES + i * MEMORY_SIZE.STRING_LENGTH);
            const OT_name =  read_string(this.buffer, box_offset + OFFSET.BOX.OT_NAMES + i * MEMORY_SIZE.STRING_LENGTH);
            return this.convert_poke(pokeG1, nickname, OT_name);
        })

    }

    private get_party_info(): Pokemon[] {
        const poke_count = this.buffer[OFFSET.PARTY.OFFSET];
        return Array(poke_count).fill(0)
            .map((_, i) => this.get_poke(OFFSET.PARTY.OFFSET + OFFSET.PARTY.POKEMONS + i * MEMORY_SIZE.POKEMON_IN_PARTY))
            .map((pkg1, i) => {
                const nickname = read_string(this.buffer, OFFSET.PARTY.OFFSET + OFFSET.PARTY.POKEMON_NAMES + i * MEMORY_SIZE.STRING_LENGTH);
                const OT_name =  read_string(this.buffer, OFFSET.PARTY.OFFSET + OFFSET.PARTY.OT_NAMES + i * MEMORY_SIZE.STRING_LENGTH);
                return this.convert_poke(pkg1, nickname, OT_name);
            })
    }


    private get_poke(offset: number) {
        //number of byte for each stat
        const poke: PokemonGen1Structure = {
            species: 1,
            currentHp: 2,
            level: 1,
            status: 1,
            type1: 1,
            type2: 1,
            item: 1,
            move1: 1,
            move2: 1,
            move3: 1,
            move4: 1,
            OGTrainerID: 2,
            exp: 3,
            EV_HP: 2,
            ATK_EV: 2,
            DEF_EV: 2,
            SPD_EV: 2,
            SPE_EV: 2,
            IV: 2,
            move1PP: 1,
            move2PP: 1,
            move3PP: 1,
            move4PP: 1,
            level_doublon: 1,
            maxHP: 2,
            atk: 2,
            def: 2,
            spd: 2,
            spe: 2
        };

        let key: keyof PokemonGen1Structure;
        for(key in poke){
            const bytes = poke[key];
            poke[key] = read_n_bytes(this.buffer, offset, bytes);
            offset += bytes;
        }

        return poke;
    };


    private convert_poke(poke: PokemonGen1Structure, nickname: string, OT_name: string = '') : Pokemon {
        return {
            OT_name,
            nickname,
            EV: {
                hp: poke.EV_HP,
                atk: poke.ATK_EV,
                def: poke.DEF_EV,
                atk_spe: poke.SPE_EV,
                def_spe: poke.SPE_EV,
                spd: poke.SPD_EV
            },
            IV: 0,
            OGTrainerID: 0,
            base_stats: {
                hp: poke.maxHP,
                atk: poke.atk,
                def: poke.def,
                atk_spe: poke.spe,
                def_spe: poke.spe,
                spd: poke.spd
            },
            currentHp: poke.currentHp,
            exp: 0,
            item: undefined,
            level: poke.level,
            moves: [undefined, undefined, undefined, undefined],
            pokedex_id: poke.species,
            status: 0,
            types: [TYPES[poke.type1], TYPES[poke.type2]]

        };
    }
}