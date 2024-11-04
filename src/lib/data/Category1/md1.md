#! title: test1 poopy head
#! date: 2021-09-01
#! tags: test, cars, logos
#! author: eli
#! image: thumb.webp

```
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
```

2. Descriptive type names are preferred over numbers. This makes it easier to understand the purpose of constant definitions. For example, use `GeneralGPIOConstants::INPUT_MODE` rather than `0`.

   - Example:

   ```
    typedef uint16_t actionConstant; //These are predefined types for the sake of clarity (They are not namespaced)
    typedef uint16_t payloadConstant; //You may need to define your own types, please keep them within the module namespace

   namespace GeneralGPIOConstants {
       constexpr uint16_t INPUT_MODE = 0; // uint16_t makes it unclear the purpose of the constant (This is a payload value)
       constexpr uint16_t SET_PIN_MODE = 1; // This is an action code
       constexpr uint16_t OUTPUT_MODE = 2; // This is a payload value
   }

   namespace BetterGeneralGPIOConstants {
       constexpr actionConstant SET_PIN_MODE = 1; // This is an action code

       constexpr payloadConstant INPUT_MODE = 0; // uint16_t makes it unclear the purpose of the constant (This is a payload value)
       constexpr payloadConstant OUTPUT_MODE = 2; // This is a payload value
   }
   ```
