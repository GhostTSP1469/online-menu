export interface Variant{label:string;price:number}
export interface Dish{id:string;category:string;name:string;en:string;composition:string;image:string;variants:Variant[];available?:boolean}
export interface Category{id:string;title:string;en:string}
export interface Menu{currency:string;categories:Category[];items:Dish[]}
