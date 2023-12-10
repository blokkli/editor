export class Serializable {
  static serialize(obj: any) {
    return {
      __class: this.name,
      obj,
    }
  }

  toJSON() {
    return Serializable
  }
}
