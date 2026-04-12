package com.medhistory.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaFallbackController {

    // Forward all non-API, non-static routes to index.html so React Router handles them
    @GetMapping(value = {
        "/visits/**",
        "/search",
        "/profile"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
