type ArrayType<T> = T extends readonly (infer T)[] ? T : never;
